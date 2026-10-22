# Why a run failed: the problem document

A node that failed carries why in its `error`: the MTHDS Protocol's problem document, the one error shape every conforming runtime emits. `GraphViewer` shows it in the node's detail panel and marks, on the graph, the pipe the run failed in. This page says what the viewer reads, how it finds the failing pipe, and what it refuses.

## The type

`GraphSpecNode.error` is `Problem`, imported from `mthds/errors`, the standard's own client, which generates it from the MTHDS core error registry. It is not redeclared here, so the viewer and every other reader of the standard read one shape. `mthds` is a dependency of this package for that type alone: no module here imports anything of it at run time, so the React-free entries, the standalone viewer included, carry none of its code. A host that builds a spec imports the type from `mthds/errors`.

## What the panel shows

The panel reads the problem's core members and nothing else, so a problem from any conforming runtime renders the same, whatever that runtime adds of its own:

- the `title`, with the `code` beside it;
- the `detail`, the sentence about this occurrence;
- **Failed in**: the pipe `location.pipe` names, followed by "(this pipe)" when the node the panel shows is the failing pipe by the rule the graph rings it by (`isFailingPipeNode`), so never on a binding, and beneath it `location.path`, the pipes from the run's main pipe down to the failing one, when the path holds more than that one pipe;
- **Next step**: `next_step.detail`, the sentence telling the reader what to do.

The problem comes first in the panel, right under the node's status, inputs and outputs, since it is what a reader opens a failed node for. A member a runtime adds of its own, such as a stack trace, is kept on the node as received and never shown. A problem that locates no pipe shows no **Failed in** row: nothing guesses where the failure happened. The enumerated members (`domain`, `retry`, `next_step.kind`) are not shown, and a value of theirs the standard does not list is accepted as it is.

## The failing pipe on the graph

When a pipe fails, the controllers above it fail too, and a runtime gives each of them the run's problem. The problem's `location.pipe` names the pipe at fault, so the viewer marks the one failed node whose own problem names its own pipe (`isFailingPipeNode`), and leaves the controllers that failed because of it unmarked. The test is made on each node, so of a batch's runs of one pipe only the run that failed is marked.

The mark is a ring in the error colour around the card (`pipe-card--failing-pipe`), or around the controller's group when a controller is itself the pipe at fault, a condition whose value no outcome maps for one (`controller-group-node--failing-pipe`). It is drawn as a box-shadow, so it composes with a validation ring, which is an outline, and changes no node's size. A hovered card keeps it, over the shadow a card takes under the pointer, and a selected card or controller group keeps it outside the selection ring, so both rings show. The card's status dot reads "Failed here" on hover. The mark is computed when the graph is built: the card carries it as `pipeCardData.failingPipe` and a controller group as `data.failingPipe`.

A binding step is no pipe, so a binding that failed is located at the sequence holding it: that sequence is the failing pipe, and the binding's card shows its failed status without the ring. `isFailingPipeNode` refuses a binding node by its kind, so a binding whose `from` path spells the sequence's code is not mistaken for it.

A `statusMap` entry that gives the failing pipe another status takes the ring off, since the status no longer says the run failed there.

The simple style shows a failed step by its status and does not draw the ring yet.

## What the validator refuses

`validateGraphSpec` drops an `error` that is `null`, the way pydantic writes a node that did not fail, and checks a present one before anything reads it. It refuses one that lacks a member the protocol requires, `type`, `title`, `detail`, `code`, `domain`, `retry` and `next_step` with its `kind` and `detail`, as well as an empty `code`, and a `location` that is present but is not an object, with a `pipe` that is not a string or a `path` that is not a list of strings. It follows the rule the standard's client reads a problem by (`isProblem`) for those members, except that it asks only that the `code` be non-empty, where the client also checks the code's pattern. Every other member passes as received. The check is written in `validateGraphSpec.ts` rather than imported, because the client's reader would bring the whole core registry into every entry that validates a spec.

The error shape this package read before, `{ error_type, message, stack }`, is no problem document, and a spec carrying it is refused at `nodes[i].error.type`. `GraphViewer` draws that refusal as its error state, naming the location, in place of the graph, rather than throwing it out of render (see [error-state.md](error-state.md)).
