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

## `0.4.0` widened the gap in exactly the way this note predicted

The bump to `0.4.0` landed green the same way, and added a fourth input kind nothing here renders. A fixed-count list (`Concept[N]`) now **gates** the Run button — a short list, an over-full one, and a list whose rows were added but left blank all hold it — the list control stops offering **Add** at the declared maximum, and the items badge shows `N of M items` only when the slot is exactly-N. None of it is reachable: the corpus's single `fixed` multiplicity is on an **output** (`pipeline_30.generate_interview_questions` → `InterviewQuestion[5]`), and the only other fixed-count ref in the tree is the `Text[2]` output of the corpus entry `invalid_inadequate_output_multiplicity`, which the sweep filters out for being invalid. A run form renders inputs, so no story here can construct the control that changed.

That makes this the second consecutive kernel release whose headline gating change this repo cannot see, which is the compounding the section below describes rather than a new problem.

## Why this is the shape of the problem rather than an oversight

The pipeline corpus was built to exercise **graph** rendering — controllers, nesting, fan-out — and its inputs are overwhelmingly `native.Text` and `native.Document` because that is what feeds an LLM pipe. The run form arrived later and inherited that corpus. The optional-input stories already had to reach outside it: `docs/run-form-panel.md` records that the two vendored MTHDS Test Corpus entries are swept precisely because the pipeline corpus has no OPTIONAL input anywhere. This is the same shortage, one level further along — the corpus has no scalar-concept inputs beyond text, and no optional structured input at all.

The consequence compounds: the kernel is where input-kind bugs live, this repo is where they would be seen, and the fixtures cannot see them. Each kernel release that fixes an input kind widens the gap between what the panel claims to support and what has ever been rendered here.

## What would close it

One authored bundle whose pipe takes, as **inputs**:

- a `native.Number` (plain, and one with a declared `minimum` / `maximum`),
- a `native.YesNo`,
- an optional structured concept whose schema has a required child — the exact shape `0.3.0`'s headline fix is about, and the one that was unusable before it,
- an optional scalar alongside, so the fold and the prune are covered on the same contract,
- a **fixed-count list** (`Concept[N]`), which is what `0.4.0` added and what nothing here gates on.

It goes in `data/pipelines/` with a `NAME_MAP` entry, then `make fixtures-contracts` — offline and fast — emits its split module.

**The blocker this section used to carry is gone.** It said to read `contracts-fixture-reshape-obligation.md` first, because a full refresh would reshape every fixture it re-sourced in front of a kernel that still read the retired `optional`. That obligation is discharged: the fixtures were regenerated onto the S2 shape and the kernel that reads it published as `0.4.0`, measured on the installed artifact with no occurrence of `optional !== true` and `presence`, `item_count`, `isFixedCountInput` and `maxItemCount` all present. `make fixtures-contracts` is an ordinary offline command again.

**This is work this repo can do itself, which is why there is no inbox item for it.** The authoring surface is not the obstacle and never was — that was worth checking rather than assuming, because a fixed-count _input_ had never been written anywhere in the workspace and "the corpus cannot reach it" reads equally well as "the language cannot express it". It can. Probed end to end through the same dumper the fixtures use, a pipe declaring `candidates = "Candidate[3]"` alongside a variable plural and an optional scalar produces exactly the contract the kernel wants:

```
aside        presence=optional  multiplicity=single    item_count=None  minItems=None maxItems=None
brief        presence=plain     multiplicity=single    item_count=None  minItems=None maxItems=None
candidates   presence=plain     multiplicity=fixed     item_count=3     minItems=3    maxItems=3
notes        presence=plain     multiplicity=variable  item_count=None  minItems=None maxItems=None
```

Both bounds land on the schema, which is what `ListRunField.itemCount` / `maxItemCount` read, so the control and the gate get what they need with no change anywhere but the bundle.

Two authoring rules will reject a first draft, and both are pipelex validations rather than anything to do with multiplicity — worth knowing so they are not mistaken for the fixed-count ref failing. Every declared input must be referenced in the prompt (_"Unused input variable(s)"_), and an optional input must be referenced through a guard — `@?aside`, an `{% if %}` block, or an inline conditional — because an unguarded `@aside` leaves the variable undefined in the template when the value is absent.

What remains genuinely open is the rest of a pipeline directory: `data/pipelines/` entries carry generated graph specs that `parity` and `nativeConceptsCorpus` read as their oracle, and those come from the DRY pass, which needs the pipelex CLI and a current local model deck. The contracts pass does not, so a form-only fixture is reachable today and a full pipeline entry waits on the deck.

## What this note is not

Not a bug. Nothing is broken, and the `0.3.0` bump was correct to land — the fixes are real, they are the kernel's to verify, and the kernel tests them. What is missing is this repo's ability to _notice_ if one of them regresses, which is the thing a downstream consumer's test suite is for.
