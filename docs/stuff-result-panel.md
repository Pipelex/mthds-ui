# The stuff panel: `StuffViewer` → `ResultPanel`

The graph's data viewer used to be `StuffViewer`, a component in `src/graph/react/stuff/` that took a payload and offered three tabs — **HTML**, **JSON**, **Pretty**. It is deleted. The panel now renders through `@pipelex/mthds-form`'s `ResultPanel`, the descriptor-driven result view.

## Why three tabs was the wrong shape

The three tabs were an honest admission of an unanswerable question. A `GraphSpec` states a concept and a payload and nothing about what that payload IS, so `StuffViewer` did the only thing left: sniffed for a URL, guessed a MIME type from a file extension, ran any `data_html` through DOMPurify, and handed the reader three renderings to choose between. Choosing is the reader's job only when the software cannot decide — and here it genuinely could not.

The standard answers the question, in an artifact built for it:

| Artifact | What it states |
| --- | --- |
| `output_form[pipe_ref]` | ONE descriptor node for the pipe's result — kind, concept identity, refinement chain, nested fields in authored order |
| `pipe_io_contracts[pipe_ref].output.json_schema` | the payload's JSON Schema, naming the property the concept's content model wraps the value under |

`buildResultField(descriptor, schema)` pairs them into a `RunField`, and `ResultPanel` lays that out **without ever inspecting the value**: a list of uniform records becomes a table, a structure a two-column grid, `native.Html` a sandboxed frame, images a gallery, prose typeset as markdown. The JSON view survives as one of the panel's two, because a receipt is worth having. "Pretty" and "HTML" do not, because they were two guesses at a question that now has an answer.

## The seam, and why it is a render prop

`@pipelex/mthds-form` is an **optional** peer of this package, isolated behind the `./form/react` entry — `./graph/react` must keep resolving with the kernel absent, and `eslint.config.mjs` pins that with `no-restricted-imports`. So `GraphViewer` cannot import `ResultPanel`. It takes a function instead:

```tsx
import { renderStuffResult } from "@pipelex/mthds-ui/form/react";

<GraphViewer
  graphspec={spec}
  renderStuffData={renderStuffResult({ contracts, outputForm })}
/>
```

The division is: **the graph owns the selection, the lookup and the panel; the renderer owns the view.** `GraphViewer` resolves the clicked node's digest to a `StuffLocation` (`src/graph/stuffLookup.ts`) and hands the renderer a `StuffRenderContext` — the item, its concept, whether the spec is a dry run, and `producerPipeRef`, the key both artifacts are keyed by.

A consumer that passes nothing gets the concept's structure table and **no data tab**. That is the deliberate floor, not a degraded mode: the graph knows a concept's shape from the spec it was given, and it does not pretend to know how to display a value it cannot describe. A tab that opens onto an empty pane reads as data that failed to load.

## The producer join, and its one wrinkle

Both artifacts are keyed by `pipe_ref`, so rendering a result means walking from the data back to the pipe that resolved to it. `findStuffByDigest` does that walk in two passes, and the order is load-bearing rather than an optimization: the same digest appears on the producer's `outputs` and again on every consumer's `inputs`, and only the producer's copy is guaranteed to carry the payload. A single-pass walk returns whichever copy the node order happened to put first.

The second pass exists for the items no pipe produced — a method's own declared inputs, which appear only as some pipe's `inputs`. Those get no `producerPipeRef`, so `renderStuffResult` returns `null` for them and the panel falls back to structure. That is correct: no pipe produced them, so no output descriptor describes them. They are a run's arguments, and `RunPanel` is the component that speaks about those.

## What was given up

**`resolveStorageUrl` is gone, and its capability with it.** `StuffViewer` took a resolver and exchanged `pipelex-storage://` URIs for presigned URLs before painting media; the kernel has no equivalent seam yet, so a result carrying a storage reference now shows the file **named** rather than rendered. That is a real gap. Porting it belongs in the kernel's file arms, where every consumer gets it, rather than being re-implemented here for one host.

`canEmbedPdf` and `onOpenExternally` went with it — both existed solely for `StuffViewer`'s PDF tile and its toolbar.

**`dompurify` left `dependencies`.** It was there only to sanitize `data_html`, and the kernel's answer to model-authored markup is a sandboxed `<iframe srcdoc>` rather than a sanitizer.

## Stories

`Form/Graph with ResultPanel` is the demonstration: the LIVE `GraphSpec` of `data/pipelines/pipeline_09` beside its generated `pipe_io_contracts` and `output_form`, wired with one prop. `Without A Renderer` is the same graph with none, showing the floor.
