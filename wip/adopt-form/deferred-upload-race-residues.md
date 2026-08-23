# Deferred: what the upload fixes deliberately left open

The PR #75 review round confirmed two real defects in `RunPanel`'s file-upload path and both were fixed (the Run gate on in-flight uploads, and the write-back reading the latest values rather than the ones its render captured). Two residues were found alongside them and deliberately **not** built. This note is so the next person meets them as decisions rather than as oversights.

## 1. Two uploads resolving inside one React batch — DEFERRED IN ERROR, NOW FIXED

Like residue 2 below, this was deferred on reasoning that turned out to be wrong, and a later review round supplied the fix. The mistake is kept because it is the same mistake twice: ruling something out on the strength of the only fix I had thought of.

**The defect.** `valuesRef` refreshed in an effect, so it was current as of the last render — not as of the last `onValuesChange` call. Two uploads resolving in the same React batch both run before any re-render, so both read the same snapshot and the second write silently dropped the first.

**The original reasoning, and what was wrong with it.** I wrote that "the only stale-proof fix is a functional updater," which would mean widening `onValuesChange` from `(values) => void` to `Dispatch<SetStateAction<…>>` — a breaking change to a just-shipped public prop, and one that contradicts the fully-controlled contract the docs state. That trade-off was real. The premise was not: there is a second fix. The continuation can advance the mirror itself, synchronously, before handing the new values to the host. The next continuation in the same batch then reads what the previous one wrote, and the effect goes on owning the sync **from** the host, so the mirror still converges on whatever the host actually kept.

**Reachability, which was also underestimated.** This needs nothing exotic — `candidate_screening.screen_candidate` (`data/pipelines/pipeline_30`) takes a required `cv` and a required `job_offer`, both single documents, both dropzones. Drop two files, have both uploads finish together, and one value is gone while its dropzone still shows a filename. `ConcurrentUploadsBothLand` pins it, verified to fail without the advance.

## 2. A late upload following a contract switch — DEFERRED IN ERROR, NOW FIXED

This was written up as harmless and deferred. It was not harmless, and the second review round found why. The reasoning is kept here because the mistake is instructive.

**The original reasoning.** Select pipe A, drop a file, select pipe B before the upload settles: the continuation writes A's dotted path into B's values. That was judged harmless because the run gate builds its payload from `contract.inputs`, so a key no field owns is never read and never reaches the wire — which `runGate.test.ts` does pin.

**What it missed.** The two pipes can share an input name, and inside a single method they do: `recruitment.cv_screening` and `recruitment.extract_cv` both declare a required, gating `cv` document. The key then _is_ owned by the new contract. A file the user chose for one pipe lands in the other looking like a deliberate answer, satisfies gating, and can be sent by the next run — silently, since nothing in the form says where the file came from. "A key nothing consumes" was true only for the case I happened to picture.

**The fix.** A drop remembers the contract it happened under; a result that resolves under a different one is discarded, and switching contracts clears `uploadingIds` so a departed upload stops gating the new form. Pinned by the `UploadDiscardedAfterPipeSwitch` play test, verified to fail without the guard. The consequence to know: `contract` is now referentially significant — a host that rebuilds it every render loses its uploads. That host is already rebuilding every field, since `fields` memoizes on the same reference.

## 3. A host that resets `values` without changing `contract` keeps a stale submit summary

`submitError` is cleared whenever the panel itself moves the values (`commitValues`, so an edit or an upload landing) and whenever `contract` changes. It is not cleared when a **host** rewrites `values` under an unchanged contract — a "clear the form" button, or re-selecting the pipe that is already showing, which `GraphWithRunPanel` does since node selection always calls `setValues({})`. The summary then stands over a form the user never submitted.

**Why it is not fixed.** The obvious fix — clear the error in an effect keyed on `values` — makes `values` referentially significant the way `contract` already is, and the failure mode is much worse than the bug. A host that passes a fresh object each render (`values={{ ...state }}`, an anti-pattern but a common one, and one that costs only memoization today) would fire that effect on every render, so a rejected submit's explanation would vanish before it could be read. Run would appear to do nothing, with no message and nothing in the console. Trading a visible stale message for an invisible disappearing one is a bad trade.

**What would justify revisiting it.** A signal for "the host replaced the values" that does not rely on reference identity — most plainly, the host telling us, if a real one ever wants a `clearErrors` handle. Do not reach for a deep compare; the values carry uploaded file blobs and arbitrary structured content.

## 4. `dumpContracts` reports a missing venv opaquely

`scripts/generate-fixtures.mjs`'s `dumpContracts` has no availability guard of the kind `assertPipelexCliAvailable` provides. On `ENOENT` its handler prints `err.stdout` / `err.stderr`, both `undefined`, so a missing interpreter surfaces as two blank lines and `dump_pipe_io_contracts.py failed` with no mention of the interpreter.

**Why it is not fixed.** In practice `PIPELEX_PYTHON` and `PIPELEX_BIN` are the same venv's `bin/`, so every flow that already calls `assertPipelexCliAvailable()` is covered. The one path that could reach it without that guard was `--from-disk`, and that path no longer calls `dumpContracts` at all. Add a venv-presence check if anyone actually hits this on a fresh checkout.
