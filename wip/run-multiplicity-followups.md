# Follow-up: a failed parallel branch's count in a run-produced graph

Status: deferred follow-up, **unverified**. Raised by Codex during `/rev` round 3 on `feature/Stuff-multiplicity` (commit 5f10f3e, item L-260926-1e1138), at the `necessity` bar, which fixes only a defect the previous pass introduced or one too severe to ship. This one is neither, so it was deferred on the reviewer's word without a verifier reading it.

## What was raised

`withDeclaredMultiplicity` reads a step's `nb_output` or `multiple_output` from its controller's sub-pipe, and `invokedMultiplicities` in `src/graph/declaredMultiplicity.ts` pairs a controller's children with its steps. A sequence pairs by position, since its children are a prefix of its steps in order. A parallel pairs by the name of the child's output, since every branch carries a distinct `result` and a branch that failed before it started leaves a gap in the children.

Codex's claim: when a parallel branch starts and its child is a controller that later fails, that controller can stay in the graph with an empty `io.outputs`. Name matching then finds no step, so the branch's `output_multiplicity` is dropped, and for a nested sequence the outputs its steps did produce before the failure lose the count the runtime handed down to them, showing single where they were lists.

## Why it was deferred

The previous pass did not introduce it: name matching for a parallel dates from the round-1 fix (d45918d), and round 2 changed only how a sequence pairs. It needs a failed run, a parallel branch invoked with a count, and a nested controller that failed partway, and its effect is a list marker missing from partial outputs of that failed run.

## What would settle and fix it

First confirm the premise on a real pipelex dry run whose nested branch fails: does a failed controller node really keep an empty `io.outputs`, and does the runtime copy the branch's count down to the steps inside it? If both hold, pair a parallel's unmatched child by its pipe reference instead: `pipeRefOf(child)` against the step's `pipe_code`, or the registry entry's `branch_pipe_code` for an inline-batch child, with any `alias->` prefix stripped. Declared branch order is the other fallback; the round-2 verifier found parallel children emitted in declared order, but with gaps wherever a branch failed before it started, so a position cannot stand alone there.
