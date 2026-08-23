# Owed: regenerate the contracts fixtures when the kernel takes the S2 reshape

The `pipe_io_contracts` fixtures this repo's form stories render were generated against the **pre-S2** wire shape, and the wire shape has since changed upstream. Nothing is broken today, and nothing here should be changed today — but the regeneration is owed, and it is owed at a moment that is easy to miss because it arrives from two repos away.

## What changed upstream

Pipelex PR #1149 (S2 "Enrich") reshaped `pipe_io_contracts` with no backward compatibility:

- an input's boolean `optional` is **replaced** by a three-valued `presence` (`plain` | `optional` | `force`);
- `multiplicity` gains a third arm, `fixed`, carrying a non-null `item_count` exactly on that arm.

`@pipelex/mthds-form` has not taken it yet. At the version this PR pins (`0.2.0`) the run gate still reads the retired key — `input.optional !== true` — and `multiplicity` has no `fixed` arm. That is filed workspace-side as `../wip/inbox/2026-08-23-mthds-form-contract-reshape.md`, severity high, with the consequence spelled out there: once the kernel meets a reshaped contract, every `?` input silently becomes **required**, because the key it tests for has simply disappeared and `undefined !== true` is true.

## What this repo holds

The generated fixtures under `src/form/react/__stories__/contracts/_generated/` are entirely pre-reshape: they carry `optional` and the two-arm `multiplicity`, and no `presence` or `item_count` anywhere. So the stories currently agree with the kernel, and both are on the old shape together. That agreement is the thing that hides the problem: nothing in this repo can go red on its own, no matter how wrong the pairing becomes.

## The local pipelex already emits the new shape — so a full refresh is now a live foot-gun

This stopped being hypothetical. A full `make fixtures-contracts` on the machine this was written on rewrote **every** pipeline's `pipe_io_contracts.json` into the reshaped form, unprompted:

```
-        "optional": false
+        "multiplicity": "single",
+        "presence": "plain"
-          "title": "TextContent",
+          "title": "native.Text",
```

The venv the contracts dump shells out to has taken S2; the committed fixtures have not. So the ordering below is not merely a thing to remember at bump time — **any full contracts refresh, run for any reason, silently performs the reshape now**, in front of a kernel that still reads `optional`. The regeneration is not a step you take when you decide to; it is a step that happens to you unless the bump is what you are doing.

Two consequences worth carrying forward. `--from-disk` is the safe way to rebuild the fixture modules without re-sourcing anything, and it is the only contracts invocation that cannot trip this. And a targeted `--only` no longer drags the two corpus entries along with it, which previously meant even a one-pipeline refresh reshaped them — that is fixed, but the pipelines it _does_ select are still reshaped, so `--only` is not a safe way to avoid this either.

## The obligation, and when it lands

**When `@pipelex/mthds-form` ships the reshape, this repo must regenerate its contracts fixtures in the same change that bumps the kernel.** `make fixtures-contracts` is offline and fast, so this is a cheap step — the cost is entirely in remembering to take it.

Do not do it earlier. Regenerating first would put reshaped fixtures in front of a kernel that reads `optional`, which is exactly the silent every-input-becomes-required failure above, only self-inflicted and inside our own test suite.

The ordering, then:

1. The kernel ships `presence` / `fixed` / `item_count`.
2. Here: bump the peer, run `make fixtures-contracts`, run `make check && make test`.
3. Expect the OPTIONAL-input stories to be where any breakage shows. `village_noticeboard.draft_notice` is the fold case, and the two vendored corpus entries are in the sweep precisely because the pipeline corpus has no OPTIONAL input anywhere — see `docs/run-form-panel.md`.

## Why this note exists rather than an inbox item

The inbox is for work crossing a boundary this repo cannot cross, and the reshape itself is already filed against `mthds-form`. What is recorded here is this repo's own follow-up to someone else's change — a second inbox item would be a duplicate addressed to us.
