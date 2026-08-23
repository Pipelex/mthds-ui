# Deferred: four robustness gaps in the contracts path of `scripts/generate-fixtures.mjs`

Raised by the adversarial pass of the gstack `/review` sweep over PR #75, and each one re-verified here before being written down. None is a defect in what the generator currently produces — every committed `pipe_io_contracts.json` parses, and the fixtures in the branch are correct. They are ways the generator can fail _quietly_ rather than loudly, which matters more here than usual because its output is committed and is the oracle the form stories are tested against.

**Why none of them was fixed in the sweep:** a change to the generator is only worth anything if it can be run end to end, and it cannot be on this machine. The local pipelex model deck is stale, so the DRY graph-spec pass dies on bundles referencing `linkup-standard` — recorded in `TODOS.md` under "Things a fresh session would otherwise rediscover the hard way". Editing the generator blind and shipping it unexercised would trade a quiet failure mode for an unverified one. These are for the next session that has a working deck.

## 1. The contracts dump's stdout is never parsed before it is committed

`dumpContracts` returns the child process's raw stdout, and both consumers take it on trust: `writePipeIoContracts` writes it straight to `pipe_io_contracts.json`, and `writeContractsFixture` interpolates `json.trim()` into a TypeScript module. `JSON.parse` appears at only two places in the file — `scripts/generate-fixtures.mjs:296` and `:694` — and both are graph specs.

The asymmetry is what makes this worth recording. The `.ts` path is loud: prettier parses the split module at `formatSplit`, so a log line prepended to the JSON fails the run. The `.json` path is silent, is written **first**, is committed, and is what `--from-disk` reads back. So a chattering pipelex boot corrupts the on-disk fixture and only trips over the error one step later, if at all.

That the boot is known to chatter is not speculation — `dumpContracts` already sets `PIPELEX_NO_DECK_NOTICE: "1"` in the child env precisely to suppress one such notice. The next notice nobody anticipated is the one this catches.

**Fix, when it can be exercised:** `JSON.parse` the stdout inside `dumpContracts` before returning it, and `die` with the offending head of the output if it fails. Parse and re-serialize, or parse and return the original text — either is fine; the point is that nothing unparsed reaches disk.

## 2. `die()` bypasses the temp-directory cleanup

`die` is `process.exit(1)` (`scripts/generate-fixtures.mjs:201-204`), and `process.exit` does not run pending `finally` blocks — measured:

```
$ node -e 'try { console.log("in try"); process.exit(0); } finally { console.log("FINALLY RAN"); }'
in try
(exit 0 — no FINALLY line)
```

The per-pipeline loop wraps its work in `try { … } finally { cleanup(); }` (`scripts/generate-fixtures.mjs:659-677`), and `writePipeIoContracts` sits inside that `try` at line 672. It reaches `die` through `dumpContracts`. So a contracts dump that fails leaves the run's `mkdtempSync` tree behind, one per failed pipeline, with the process reporting the real error but never releasing the directory.

Pre-existing in shape — `die` predates this PR — but the contracts path adds a new way to reach it from inside that `try`.

The two `assertPipelexPythonAvailable()` guards added in review round 13 deliberately do **not** widen this. Both run before the loop, so no `mkdtempSync` tree exists yet when they can fire — which is the reason that commit placed them up front rather than letting the interpreter's absence surface at the first `dumpContracts` call, where it would have been both a worse message and a leak.

**Fix:** either make `die` throw a tagged error that `main()` catches, reports and exits on (so `finally` runs), or register the cleanups with `process.on("exit", …)`. The first is cleaner and keeps `die`'s call sites unchanged.

## 3. `--only` restricts the pipelines but not the two corpus entries — FIXED

Codex raised this independently in a later review round, which is what got it done. The deferral reason recorded below — that a generator change cannot be exercised end to end here — turned out to apply only to the DRY graph-spec pass, whose model deck is stale. **The contracts pass is offline and runs fine**, so this one was exercisable all along; the blanket reason in the header was too broad.

Fixed by skipping the corpus re-sourcing whenever `--only` is set, which is the same rule the pipelines already follow: an unselected pipeline is read from the JSON committed beside it rather than re-run. Demonstrated before and after by watching the split's mtime — a pipeline-only refresh used to rewrite `feature_optionals_village_notice.ts`, and now leaves it untouched while a full run still refreshes it. The run also prints which corpus entries it reused rather than re-sourced, so the narrowed scope is stated rather than silent.

The description below is kept because it is still the clearest statement of _why_ this mattered, and because option two in it — letting `--only` name a corpus entry, making them individually refreshable — was NOT taken and remains the better answer if anyone needs to refresh one.

`make fixtures-contracts ONLY=pipeline_05` correctly limits the pipeline loop — `selected` is built from `ONLY` and only those get `writePipeIoContracts`. But the fixture assembly that follows is called with the full list, at both call sites:

```
scripts/generate-fixtures.mjs:611:  const fixture = await writeContractsFixture(allPipelines, prettierConfig);
scripts/generate-fixtures.mjs:816:  const fixture = await writeContractsFixture(allPipelines, prettierConfig);
```

Passing `allPipelines` is correct and deliberate for the pipelines — the barrel's contract is "re-export every split on disk", and the pipeline contracts are read from their committed JSON, not re-run. The unrestricted part is the two vendored corpus entries: they have no writable directory of their own, so their split module _is_ their on-disk form, and `writeContractsFixture` re-sources them through the pipelex venv on every invocation that is not `--from-disk`.

So a targeted refresh of one pipeline also silently re-sources `feature_optionals_village_notice` and `feature_smart_inputs_claims_triage` onto whatever the local venv currently is. That is the hazard the file's own header warns about for LIVE runs — a fixture swept onto an incidental pipelex version — arriving on the offline path where nobody is watching for it.

**Fix:** have `writeContractsFixture` take the selection and skip the corpus dumps when `ONLY` is set and names no corpus entry; or let `--only` accept corpus entry names, which would also make them individually refreshable. The second is more useful and not much more code.

## 4. A mid-run abort leaves the JSON and the split modules disagreeing

The contracts JSON is written per pipeline inside the loop; the `.ts` splits and the barrel are written once, after it. An abort in between — any `die`, a failed pipelex run, an interrupt — leaves N pipelines with a refreshed `pipe_io_contracts.json` whose split module still carries the previous contents. Nothing detects the disagreement: the stories import the splits, so they stay green on stale data, and the next `--from-disk` reconciles it silently.

Same shape as the graph-spec path, where the spec JSON is written before `copyRunArtifacts` is known to have succeeded.

**Fix:** low priority and the least clear-cut of the four. The honest options are to write the splits per pipeline alongside their JSON (so the two move together and an abort truncates both at the same point), or to add a `--check`-style reconciliation that fails when a split disagrees with the JSON beside it. Neither is worth doing on its own; worth folding into the next real change to this path.
