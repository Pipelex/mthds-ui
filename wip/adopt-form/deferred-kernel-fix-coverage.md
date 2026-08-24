# Deferred: no fixture exercises the input kinds the kernel keeps fixing

The `@pipelex/mthds-form` `0.2.0 → 0.3.0` bump landed green with no source change, which is the outcome the panel's design predicts — it reads no `json_schema` and sniffs no value shape, so a kernel derivation change is meant to be invisible here. The bump is the first evidence for that claim. It is weaker evidence than a green suite suggests, and the reason is worth writing down before it is mistaken for coverage.

## What `0.3.0` fixed, and why none of it is reachable here

Every fix in that release lands on an input kind this repo has no fixture for:

| Kernel fix                                                                                                                  | Why no story reaches it                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An optional **structured** input stays absent when untouched, instead of materializing empty children the gate then rejects | The only optional input in the entire rendered set is `village_noticeboard.style_hint`, a scalar `native.Text`. There is no optional structured input anywhere.                                                                                                                                                               |
| A `native.Number` input wraps into the `{number: …}` envelope its concept declares                                          | The corpus's single `native.Number` (`pipeline_34`) is an **output**. A run form renders inputs.                                                                                                                                                                                                                              |
| A `native.YesNo` input renders as a switch rather than a card wrapping one                                                  | All four `native.YesNo` occurrences (`pipeline_32`, `pipeline_33`) are **outputs**.                                                                                                                                                                                                                                           |
| A number's declared `minimum` / `maximum` reach the stepper                                                                 | Reachable only through a number nested in a structured concept (`recruitment.MatchScore.score`), and that field declares no range.                                                                                                                                                                                            |
| A validation error names the identifier (`audience`) rather than the schema title (`Audience`)                              | No story asserts on an error's wording. `InvalidSubmit` asserts an alert exists; `HostTranslatesTheErrorSummary` asserts the host's translator won, and its translator returns one constant for every key by design — it is robust to which branch runs, which is what makes it a good i18n test and a blind one for wording. |

So the suite is green because nothing regressed, not because the fixes were verified. Both statements are true and only the first is what a passing run licenses.

## Why this is the shape of the problem rather than an oversight

The pipeline corpus was built to exercise **graph** rendering — controllers, nesting, fan-out — and its inputs are overwhelmingly `native.Text` and `native.Document` because that is what feeds an LLM pipe. The run form arrived later and inherited that corpus. The optional-input stories already had to reach outside it: `docs/run-form-panel.md` records that the two vendored MTHDS Test Corpus entries are swept precisely because the pipeline corpus has no OPTIONAL input anywhere. This is the same shortage, one level further along — the corpus has no scalar-concept inputs beyond text, and no optional structured input at all.

The consequence compounds: the kernel is where input-kind bugs live, this repo is where they would be seen, and the fixtures cannot see them. Each kernel release that fixes an input kind widens the gap between what the panel claims to support and what has ever been rendered here.

## What would close it

One authored bundle whose pipe takes, as **inputs**:

- a `native.Number` (plain, and one with a declared `minimum` / `maximum`),
- a `native.YesNo`,
- an optional structured concept whose schema has a required child — the exact shape `0.3.0`'s headline fix is about, and the one that was unusable before it,
- an optional scalar alongside, so the fold and the prune are covered on the same contract.

It goes in `data/pipelines/` with a `NAME_MAP` entry, then `make fixtures-contracts` — offline and fast — emits its split module. **Read `contracts-fixture-reshape-obligation.md` first:** that command is currently a foot-gun for reasons unrelated to this note, and a full refresh reshapes every fixture it re-sources in front of a kernel that still reads `optional`. At the time of the `0.3.0` bump the installed kernel was measured pre-S2 (four occurrences of `optional !== true`, no `presence`), so the obligation was still owed and the fixtures were deliberately left alone.

Adding the bundle is worth pairing with that regeneration rather than doing twice.

## What this note is not

Not a bug. Nothing is broken, and the `0.3.0` bump was correct to land — the fixes are real, they are the kernel's to verify, and the kernel tests them. What is missing is this repo's ability to _notice_ if one of them regresses, which is the thing a downstream consumer's test suite is for.
