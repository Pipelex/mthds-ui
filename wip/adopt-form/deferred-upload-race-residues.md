# Deferred: what the upload fixes deliberately left open

The PR #75 review round confirmed two real defects in `RunPanel`'s file-upload path and both were fixed (the Run gate on in-flight uploads, and the write-back reading the latest values rather than the ones its render captured). Two residues were found alongside them and deliberately **not** built. This note is so the next person meets them as decisions rather than as oversights.

## 1. Two uploads resolving inside one React batch can still clobber each other

`valuesRef` refreshes in an effect, so it is current as of the last commit — not as of the last `onValuesChange` call. If two uploads resolve within the same batch, the second continuation reads a ref that the first one's update has not yet been committed into, and the first upload's value is lost.

**Why it is not fixed.** The only stale-proof fix is a functional updater, and `RunPanelProps.onValuesChange` is `(values: Record<string, unknown>) => void` — deliberately, because it lets a host hold its values anywhere rather than forcing them into a `useState`. Widening it to `Dispatch<SetStateAction<…>>` is a breaking change to a just-shipped public prop and contradicts what `docs/run-form-panel.md` documents as a fully controlled component.

**What would justify revisiting it.** A host reporting lost files on a form where a user drops several at once and the uploads finish near-simultaneously. Until then the cost (an API break for every consumer) is far above the risk.

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
