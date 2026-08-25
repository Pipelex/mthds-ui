# Discharged: the contracts fixtures were regenerated when the kernel took the S2 reshape

**This obligation is met. Nothing here is owed any more** — the note is kept because the ordering it records is the reason the regeneration was safe, and a reader who finds only a clean tree cannot reconstruct that.

The regeneration ran in the adoption change that moved this repo onto the post-`0.3.0` form kernel, which is exactly the moment the ordering below reserved for it. What follows is the record of why it had to wait, and what it looked like when it landed.

## What changed upstream

Pipelex PR #1149 (S2 "Enrich") reshaped `pipe_io_contracts` with no backward compatibility:

- an input's boolean `optional` was **replaced** by a three-valued `presence` (`plain` | `optional` | `force`);
- `multiplicity` gained a third arm, `fixed`, carrying a non-null `item_count` exactly on that arm.

One correction to what this note originally predicted: the **output** contract did not reshape the same way. It keeps a boolean `optional` — `!` is rejected on an output, so output presence is genuinely two-valued — and gained the same `multiplicity` / `item_count` pair as the input side.

At the version this repo pinned while the note was live (`0.3.0`), `@pipelex/mthds-form` still read the retired key — `input.optional !== true` — and `multiplicity` had no `fixed` arm. The consequence, had the fixtures moved first, was that every `?` input would silently have become **required**, because the key being tested for had simply disappeared and `undefined !== true` is true.

## Why nothing here could go red on its own

The generated fixtures and the kernel were pre-reshape **together**. That agreement is what hid the problem: no test in this repo could fail however wrong the pairing became. The same structural blind spot is why the ordering had to be written down rather than left to a suite to enforce.

It was not hypothetical either. A full `make fixtures-contracts`, run for an unrelated reason while the note was live, rewrote every pipeline's contracts into the reshaped form unprompted — because the interpreter the dump shells out to is an **editable install** pointing at the sibling `pipelex/` checkout, so it runs that checkout's code rather than a pinned wheel and its reported version says nothing about which shape it emits. Nothing failed and nothing went red; the reshaped fixtures were caught only because the tree was being watched for another reason.

The check that answered it, and the one to reach for if this ever recurs:

```
$ ../pipelex/.venv/bin/python -c "from pipelex.pipeline.pipe_io_contracts import PipeInputContract; print(list(PipeInputContract.model_fields.keys()))"
['concept_ref', 'presence', 'multiplicity', 'item_count', 'json_schema']
```

## How it was discharged

In one change, in this order:

1. **The dumper was fixed first.** `scripts/dump_pipe_io_contracts.py` serialized with `exclude_none=True`, which stripped `item_count` from every non-`fixed` slot — nearly all of them — so the fixtures would have described a shape the wire never sends, invisibly, because the generated modules cast through `unknown`. Fixing this after regenerating would have meant regenerating twice. `item_count` is the only nullable field on either contract model, so dropping the flag restored exactly that and nothing else.
2. **Then the full sweep**, `make fixtures-contracts` — offline, fast, no API budget.
3. **Then the suite**, green, including the browser stories.

What the reshaped tree holds, as an audit rather than a promise: the boolean `optional` is gone from every input slot and `presence` is on all of them; `item_count` is present on every input and output slot; the boolean `optional` survives on every output, which is correct. `village_noticeboard.draft_notice.style_hint` is the corpus's only OPTIONAL input, which is why the two vendored corpus entries are swept alongside the pipelines at all — the pipeline corpus has no optional input anywhere. Plurality moved out of `concept_ref` (no ref carries `[]` any more) and into `multiplicity`.

**One coverage gap the reshape exposed, and it is worth knowing.** The corpus's single `fixed` multiplicity is on an **output** (`pipeline_30`, `item_count: 5`). No fixture anywhere declares a fixed-count _input_, so the kernel's new `Concept[N]` input behaviour — gating on the declared count, capping the row control, the `2 of 3 items` badge — is exercised by the kernel's own tests and by nothing here. Closing it needs a bundle that declares one; see `deferred-kernel-fix-coverage.md`, which is the standing note about corpus shapes this repo cannot reach.

## Why this note existed rather than an inbox item

The inbox is for work crossing a boundary this repo cannot cross, and the reshape itself was filed against `mthds-form`. What was recorded here was this repo's own follow-up to someone else's change — a second inbox item would have been a duplicate addressed to us.
