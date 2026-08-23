# Deferred: what the upload fixes deliberately left open

The PR #75 review round confirmed two real defects in `RunPanel`'s file-upload path and both were fixed (the Run gate on in-flight uploads, and the write-back reading the latest values rather than the ones its render captured). Two residues were found alongside them and deliberately **not** built. This note is so the next person meets them as decisions rather than as oversights.

## 1. Two uploads resolving inside one React batch can still clobber each other

`valuesRef` refreshes in an effect, so it is current as of the last commit — not as of the last `onValuesChange` call. If two uploads resolve within the same batch, the second continuation reads a ref that the first one's update has not yet been committed into, and the first upload's value is lost.

**Why it is not fixed.** The only stale-proof fix is a functional updater, and `RunPanelProps.onValuesChange` is `(values: Record<string, unknown>) => void` — deliberately, because it lets a host hold its values anywhere rather than forcing them into a `useState`. Widening it to `Dispatch<SetStateAction<…>>` is a breaking change to a just-shipped public prop and contradicts what `docs/run-form-panel.md` documents as a fully controlled component.

**What would justify revisiting it.** A host reporting lost files on a form where a user drops several at once and the uploads finish near-simultaneously. Until then the cost (an API break for every consumer) is far above the risk.

## 2. A late upload following a contract switch writes one spurious key

Select pipe A, drop a file, select pipe B before the upload settles: the continuation writes A's dotted path into B's values. `GraphWithRunPanel.stories.tsx` is exactly this shape, since selecting a node resets `values` to `{}`.

**Why it is not fixed.** It is harmless. The run gate builds its payload from `contract.inputs`, so a key no field owns is never read and never reaches the wire — `runGate.test.ts` already pins that ignoring behaviour. Aborting an in-flight upload on a contract change means threading a cancellation token through a promise the host owns, to prevent a value nothing consumes.

**What would justify revisiting it.** The panel gaining a "values look unsaved" affordance, or any feature that starts treating `values` keys as meaningful independently of the contract.

## 3. `dumpContracts` reports a missing venv opaquely

`scripts/generate-fixtures.mjs`'s `dumpContracts` has no availability guard of the kind `assertPipelexCliAvailable` provides. On `ENOENT` its handler prints `err.stdout` / `err.stderr`, both `undefined`, so a missing interpreter surfaces as two blank lines and `dump_pipe_io_contracts.py failed` with no mention of the interpreter.

**Why it is not fixed.** In practice `PIPELEX_PYTHON` and `PIPELEX_BIN` are the same venv's `bin/`, so every flow that already calls `assertPipelexCliAvailable()` is covered. The one path that could reach it without that guard was `--from-disk`, and that path no longer calls `dumpContracts` at all. Add a venv-presence check if anyone actually hits this on a fresh checkout.
