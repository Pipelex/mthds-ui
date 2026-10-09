# Static Graphs

Static graphs render a MTHDS method from authored `.mthds` TOML without running
Pipelex. They are deterministic, best-effort, and intended for method-preview
surfaces such as editors, build tools, hub pages, and Storybook fixtures.

## API

```ts
import { buildStaticGraphSpecFromToml } from "@pipelex/mthds-ui/static-graph";

const { spec, diagnostics } = buildStaticGraphSpecFromToml(tomlText);
```

`spec` is a normal `GraphSpec` and can be passed straight to `GraphViewer`.
`diagnostics` contains non-fatal parse, merge, and walk notes. The static path is
best-effort: malformed or incomplete bundles should still produce whatever graph
can be inferred.

### Multi-file method packages

A method may span several `.mthds` files: a root file carrying the boundary concepts and the entry pipe declared as a signature, plus one file per pipe that fills a forward declaration in. Pass them together — `buildStaticGraphSpecFromToml` accepts an array and merges before it walks:

```ts
const { spec, diagnostics } = buildStaticGraphSpecFromToml([rootToml, ...libraryTomls]);
```

Order only decides which bundle's `main_pipe` and `description` the merged set adopts, so lead with the entry point. It does **not** decide which definition of a pipe wins: a signature is a forward declaration and the concrete pipe of the same code is its definition, so **the concrete always wins**, matching how pipelex reconciles the same collision when it loads a library. The collision is silent when the two halves agree — that is, when the signature's `signature_for` is absent (it is an optional hint) or names the concrete's own type. A signature promising `signature_for = "PipeSequence"` that is filled by a `PipeLLM` still resolves to the `PipeLLM`, because a renderer draws what was built, but reports `signature-type-mismatch`: the merge is the only place that ever sees both halves at once. A clash the merge cannot resolve this way — two concrete pipes, or two signatures — keeps the first declaration and reports `duplicate-pipe`.

Passing the root file alone is not a smaller version of this: the entry pipe is a signature there, so the walk renders a single unexpanded leaf card.

### Which file leads

A host holding a method as a list of files puts them in order with `orderMthdsSources`, the rule every host shares rather than each keeping its own copy:

```ts
import { buildStaticGraphSpecFromToml, orderMthdsSources } from "@pipelex/mthds-ui/static-graph";

const ordered = orderMthdsSources(files); // files: { name, content }[]
const { spec, diagnostics } = buildStaticGraphSpecFromToml(ordered.map((file) => file.content));
```

The file declaring a top-level `main_pipe` leads, `bundle.mthds` when several do, and the rest keep the order they were given in, so a host wanting a deterministic merge only has to list its files deterministically. When no file declares `main_pipe`, the order stays as given. `selectPrimaryMthdsSource` returns the leading file alone.

Both take an optional `preferred` file, the one an editor has open. It leads whenever it declares `main_pipe` itself, which is how a directory holding several variants of an entry point graphs the variant being edited, and it also leads when no file declares one. Both find it in the list by its exact `name` and read the listed entry, so a host can pass its own plain `{ name, content }` object for the open file, the result keeps the type of the list's own entries with whatever fields a host adds to them, and the two always agree on which file leads. The whole `name` is compared: `variant.mthds` does not find a listed `method/variant.mthds`, and a `preferred` whose name is not in the list is ignored.

`hasTopLevelMainPipe` is a line scan rather than a TOML parse, so a syntax error further down a half-written file does not demote the file that plainly declares the entry point. Only the last path segment of a file's `name` is compared with `bundle.mthds`, without regard to case.

## Drawing a method in a standalone page

The standalone viewer bundle, `dist/standalone/graph-viewer.js`, is one script a page loads with a plain `<script>` tag, from jsDelivr for instance. It carries the static builder, so a page that embeds a method's `.mthds` files draws the method by itself, the way a Mermaid page carries its diagram's text and loads the renderer: no build step, no Pipelex install, no run. This is the complete page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Research brief</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@pipelex/mthds-ui@X.Y.Z/dist/standalone/graph-viewer.css"
    />
  </head>
  <body>
    <div id="app-container"><div id="root"></div></div>
    <script type="application/json" id="mthds-sources">
      [
        {
          "name": "bundle.mthds",
          "content": "domain = \"market_research\"\nmain_pipe = \"write_research_brief\"\n…"
        }
      ]
    </script>
    <script type="application/json" id="pipelex-config">
      { "direction": "TB", "theme": "system" }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/elkjs@0.11.1/lib/elk.bundled.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@pipelex/mthds-ui@X.Y.Z/dist/standalone/graph-viewer.js"></script>
  </body>
</html>
```

The embed contract:

- **The element** is `<script type="application/json" id="mthds-sources">`. The JSON type keeps the browser from running it. Its id carries no `pipelex-` prefix, unlike the `pipelex-graphspec` and `pipelex-config` embeds, because what it holds is the standard's own artifact.
- **Its content** is a JSON array with one `{ "name": string, "content": string }` object per `.mthds` file of the method, the same shape as an `mthds_sources[]` entry on the hosted API. `name` is the file name, non-empty and distinct from the others; `content` is the file's text. Any other key is ignored.
- **Every `<` is written as `\u003c`**. JSON reads the escape back as `<`, while the HTML parser never meets one inside the element. Without it, a method whose text contains `</script>` ends the element early and the rest of its text is parsed as HTML, and a `<!--` changes how the element is tokenized; a prompt quoting a line of HTML is enough. Escaping every `<`, rather than matching `</script>`, is what makes it hold: the parser also ends the element on `</script ` and `</script/`, in any case.
- **The files may come in any order.** The bundle applies `orderMthdsSources` itself (see [Which file leads](#which-file-leads)), so an embedder never implements the rule; listing the rest in name order keeps the merge deterministic.
- **`pipelex-config` is optional** and takes the same keys as on a GraphSpec page: `direction`, `foldMode`, `showControllers`, `theme`, `toolbarPosition` and the rest of `GraphConfig`.
- **A page carries one graph.** Embedding a non-empty `pipelex-graphspec` beside `mthds-sources` is an error. An element that is empty or holds only whitespace counts as absent.
- **The page needs `#root` inside `#app-container`**: the viewer mounts on `#root`, and `graph-viewer.css` sizes `#app-container` to the window. The bundle mounts once, when the document has loaded.

A TypeScript host writes the element's text with `serializeMthdsSourcesEmbed(files)` from `@pipelex/mthds-ui/static-graph`, which checks the list against this contract, keeps only `name` and `content`, and applies the escape; `MTHDS_SOURCES_EMBED_ID` is the element's id. `JSON.stringify` has no HTML-safe mode, so a host in another language writes the escape itself, as `json.dumps(sources).replace("<", "\\u003c")` in Python, or lets Jinja's `tojson` filter do it, which escapes `<` among a few other characters.

The builder's diagnostics reach the viewer through `staticDiagnosticsToValidationIssues`, under the toolbar widget's `unvalidated` state (see `docs/validation-widget.md`): the toolbar shows an information mark with the count, its dropdown lists every note, and a note the builder pinned to a pipe rings that pipe's nodes. The state exists because nothing validated the method. The notes are what reading the source turned up, and a note the builder could not pin to any node, such as a file that is not valid TOML, would otherwise leave an empty canvas and no explanation. A method the builder read without a note shows no widget at all. A malformed embed (JSON that does not parse, anything other than a non-empty array, an entry without a `name` or `content` string, a repeated name) shows the error screen, naming the entry at fault.

Pin an exact version in both URLs, and add `integrity` and `crossorigin="anonymous"` attributes as pipelex's generated graph pages do, so the page keeps drawing the same way and the browser refuses a file that changed. Carrying the builder adds about 40 KB to a viewer bundle of about 800 KB.

## Mode Contract

GraphSpec metadata now has an explicit mode:

```ts
meta: {
  format: "mthds";
  mode?: "dry" | "live" | "static";
}
```

Static behavior is enabled only by `meta.mode === "static"`. A missing mode is a
legacy runtime graph, not a static graph.

`validateGraphSpec` accepts `mode: "static"`, `"dry"`, `"live"`, and legacy
missing `mode`. Unknown modes are rejected.

## Static vs Dry vs Live

| Mode     | Source                                         | Purpose                                | Runtime chrome |
| -------- | ---------------------------------------------- | -------------------------------------- | -------------- |
| `static` | Authored `.mthds` TOML via `src/static-graph/` | Method structure preview               | Hidden         |
| `dry`    | Pipelex dry-run trace                          | Executability and mocked run structure | Shown          |
| `live`   | Pipelex live trace                             | Actual run state and data              | Shown          |

Static cards do not show status dots, pulse animation, or status titles.
Static pipe details hide status, duration, metrics, and execution-data dumps.
They keep authored blueprint sections, IO, concept links, descriptions, static
tags, and errors/diagnostics when present.

Dry pipe details keep run status and timing chrome, but hide generated mock
payloads, metrics, and rendered execution-data values. Dry stuff-node details
show concept structure only, not the generated data created by the fixture run.

`statusMap` overlays are ignored for static cards. Live-status overlay onto a
static graph needs a separate identity-mapping design because repeated
invocations can share a `pipe_code`.

## Concept Refs

An io ref names a concept and then, optionally, two suffixes in a fixed order — multiplicity before presence:

| Ref       | Multiplicity    | Presence                                             |
| --------- | --------------- | ---------------------------------------------------- |
| `Text`    | `null` (single) | `plain`                                              |
| `Text[]`  | `true` (many)   | `plain`                                              |
| `Text[3]` | `3`             | `plain`                                              |
| `Text?`   | `null`          | `optional` — the slot may legitimately hold no value |
| `Text!`   | `null`          | `force` — a use-site assertion that a value is there |
| `Text[]?` | `true`          | `optional`                                           |

`parseConceptRef` mirrors the suffix half of the runtime's `MULTIPLICITY_PATTERN` (`pipelex/core/pipes/variable_multiplicity.py`) exactly, so the two agree on every multiplicity/presence combination and reject the same malformed ones — `Text?[]` and `Text??` are not refs. The identifier half is deliberately looser here, as everywhere in this module: the runtime requires each dotted segment to start with a letter or underscore, while this parser accepts a leading digit (`1Text`) and repeated dots (`a..b.C`). A static renderer gains nothing from rejecting a name the runtime would reject anyway, so it renders what it was given. Both suffixes land on `StuffSpecInfo`, as `multiplicity` and `presence`, matching what pipelex serializes into a dry or live spec's `pipe_registry`; an absent `presence` reads as `plain`, the runtime's own default.

Both suffixes belong to an **io slot**, never to concept inheritance: `refines` names a concept, so a `refines` carrying either is refused with an `invalid-concept-ref` warning rather than silently stripped down to the bare code.

A ref the grammar does not accept is not fatal, but it is lossy in a way worth knowing: an input whose ref will not parse is **dropped from the pipe entirely** with an `invalid-concept-ref` warning, and an output that will not parse falls back to `native.Anything` with a `missing-pipe-output` warning. That is why the fixture sweep tolerates no warnings at all — a suffix the parser has not learned yet looks exactly like a method that never declared the slot, and a slot form it has not learned yet looks the same (see [Input Slot Declarations](#input-slot-declarations)).

## Input Slot Declarations

A value in a pipe's `inputs` table has two forms, and the standard (`docs/spec/mthds-format.md`, "Input slot declarations") states them equivalent:

```toml
[pipe.write_card.inputs]
title = "BookTitle"
notes = { concept = "Text?", hints = { intent = "prose" } }
```

`concept` is required and carries exactly the same grammar as the string form — ref, then multiplicity, then presence — so `{ concept = "Text?" }` resolves optional just as `"Text?"` does. `parseInputSlot` unwraps the table and hands `concept` to `parseConceptRef`, which means the resulting `StuffSpecInfo` is identical whichever form authored the slot. That identity is the point: a hinted input is an ordinary edge in the graph, and nothing downstream can tell how it was written.

The expanded form is **inputs only**. `output` is always a string, so `output = { concept = "Text" }` does not parse and falls back to `native.Anything` with the usual `missing-pipe-output` warning.

`concept` being required means a slot can fail two ways, and the `invalid-concept-ref` warning words itself for the one that happened: a slot table with no `concept` key at all is told the key is required, while a `concept` that was written and will not parse is told its ref is uninterpretable. The distinction matters because a hints-only slot — `notes = { hints = { intent = "prose" } }` — is the natural slip when reaching for the expanded form, and blaming a ref the author never wrote reads as a grammar problem when the fix is to add the key.

An input name is a plain name (`^[a-z][a-z0-9_]*$` in the schema), and a field of an input is reached by a [binding step](#binding-steps), never by a dotted input name. The runtime refuses any other name with `invalid_input_name`, so the builder skips it with an `invalid-input-name` warning rather than draw an input nothing in scope holds. A quoted dotted name (`"doc.title" = "Text"`) is told to declare `doc` and read the field through it, or to have the calling sequence bind the field with `{ from = "doc.title", result = "title" }`. Unquoted, TOML nests the same name into a table, `doc = { title = "Text" }`, which the slot form would read as a slot with an unknown key and no `concept`; a table with no `concept` whose every key leads to a concept ref can only be that, because a concept code is PascalCase, so it gets the same warning, naming the dotted name it was written as, and nothing else.

A name a step stores a value under is held to the same grammar, because a pipe reads the stored value through an input: a `PipeSequence` step's or a `PipeParallel` branch's `result` and `batch_as`, and a `PipeBatch`'s `input_item_name`. The schema carries the plain-name pattern on each of those fields, and the runtime refuses any other name there with `invalid_input_name`, one taking the reserved `_bound_` prefix among them. The builder reports such a name with an `invalid-input-name` warning at the field (`pipe.<code>.steps[<i>].result`, `pipe.<code>.branches[<i>].batch_as`, `pipe.<code>.input_item_name`) and draws the step as written, since unlike an input the name belongs to a step that still runs a pipe the graph has to show. A binding step's `result` is a stored name too, refused as a malformed binding step instead (see [Binding Steps](#binding-steps)). Two names a batch reads get the same warning at their field and are drawn the same way: a `PipeBatch`'s `input_list_name`, which names one of the batch's own inputs and so is a plain input name, a dotted one being told to declare the list under a plain name that the calling sequence binds the field to, or to batch over the field in a step instead; and a `batch_over` with no dot that takes the `_bound_` prefix, which the runtime keeps for the list a dotted `batch_over` binds. A dotted `batch_over` is a path, so one with an underscore-led segment stays a malformed binding step.

`hints` is read as a known key and then dropped. Its shape is not checked here either, and both of those are the same decision: **intent hints do not travel on the GraphSpec.**

### Why hints are parsed and dropped

Intent hints (`docs/spec/intent-hints.md`) are non-normative presentation intent, and they exist for renderers to honor — so a rendering library dropping them looks like a gap. It is not, and the reason is that the standard already routes them somewhere else.

- **The GraphSpec has no place to put them.** pipelex's runtime `StuffSpec` and `Concept` carry no `hints` field — hints live on the _blueprints_ (`ConceptBlueprint`, the structure-field blueprint, `InputSlotBlueprint`), and a GraphSpec's `pipe_registry` is serialized from the runtime objects. Adding a `hints` member to `StuffSpecInfo` would put a field in a static spec that a dry or live spec can never carry, which is exactly what `parity.test.ts` exists to prevent.
- **The artifact that carries them is the input-form descriptor.** `docs/spec/input-form-descriptor.md` gives every field descriptor an optional `hints` object holding the node's _effective_ hints — the key-by-key merge along the refinement chain and then the site layer — so a consumer reads one map and walks nothing. That merge needs the concept registry and the refinement chain, which is producer work, not something a graph renderer should be re-deriving from bundle text.
- **This library already reads that channel.** `src/form/` renders the descriptor through `@pipelex/mthds-form`, so the hint an author writes on a slot reaches this repo's form panel by the route the standard designed for it — carried onto the field descriptor the panel is given. Honoring it in a control is the kernel's side of that seam and is not yet rendered at the pinned version, so an author testing this today sees the hint arrive and change nothing. See `docs/run-form-panel.md`.

So a hint changes how a slot is _filled in_, never how it is _drawn_, and the static builder is the drawing half. If a graph card ever wants to honor `intent`, the change is to feed the viewer a descriptor beside the spec — not to widen `StuffSpecInfo`.

### Unknown slot keys

The slot table is closed: the spec says an unknown key MUST be rejected, and pipelex implements that as `extra="forbid"` on `InputSlotBlueprint`. This module renders rather than adjudicates, so it does neither of the two extremes. It reports the key with an `unknown-input-slot-key` warning naming it, and still resolves the slot from its `concept` — dropping the edge would lose more than the unknown key was worth, and staying silent would draw a clean graph for a bundle the runtime refuses.

That is also the line between a key and a malformed `hints` table — and the line is not "what the runtime refuses", because the runtime refuses both (`hints` is typed `dict[str, str] | None`, so `hints = "prose"` is as invalid as an unknown key). The line is what could change the graph. An unknown key may be where a future version of the standard puts something that changes the slot, so it is named. A malformed `hints` cannot be: it is content this module never reads under any future reading, so reporting it belongs to a validating implementation, not to the renderer.

## Native Concepts

`src/static-graph/conceptRefs.ts` carries a hand-kept catalog of the MTHDS native concepts: each code with its description, the native it refines where the runtime records one (`Markdown` refines `Text`), and its pinned fields. It is the one place this module knows a native, so a ref that resolves as a native is one the [binding walk](#binding-steps) can walk, and the two cannot drift apart. Its authority is the standard's pinned set — `docs/spec/native-concepts.md` in the sibling `mthds/` repo — which pipelex mirrors in `pipelex/core/concepts/native/concept_native.py` (`NativeConceptCode`) and `native/pinned_blueprints.py` (the descriptions and fields), together with `Markdown`, which pipelex defines ahead of the standard. Copy the code list, the wording and the fields from there, in `NativeConceptCode`'s order; if the mirror and the spec page ever disagree on a native the standard pins, the spec page wins.

The catalog is what makes a native ref resolve as native: it decides whether a bare `YesNo` resolves into the `native` domain (description, `YesNoContent` structure class) or falls through to the authoring domain, and whether `refines = "YesNo"` qualifies to `native.YesNo`. A code the catalog does not know does not throw — it degrades into a stub with the wrong domain, an empty description, and a synthetic `<domain>__<Code>` structure class name.

Nothing this repo diffs enumerates the codes (the bundled `data/schema/mthds_schema.json` does not list them), so a native added upstream does not announce itself. Two tests cover this from opposite directions:

- `src/static-graph/__tests__/nativeConcepts.test.ts` pins the expected code list and its canonical order, which makes any edit to the catalog a deliberate two-place change. Both lists live here, so it cannot see an upstream change on its own — it holds the ordering, and the codes the corpus does not reach.
- `src/static-graph/__tests__/nativeConceptsCorpus.test.ts` compares the catalog against an oracle this repo did not author. Every `data/pipelines/*/dry_run_graph_spec.json` is pipelex output, so each `concept_registry` entry with `domain_code === "native"` carries pipelex's own code, description, and structure class name. **A native code pipelex emits into the corpus that our catalog lacks fails this test**, as does a reworded description or a renamed structure class. The set of codes the corpus reaches is written out explicitly, so deleting a fixture fails the test rather than silently emptying it.

Read that scope precisely. A dry spec's `concept_registry` holds the concepts that spec **references**, not every native pipelex knows — `pipeline_01` contributes only `Text`. So the oracle catches a change to a native some bundle actually uses, on the next `make fixtures`. A brand-new native that no bundle references is still invisible, and stays a job for tooling outside this repo. Adding a bundle that uses a native is what brings it in scope — which is what `pipeline_32`/`33`/`34` do.

Coverage is every catalog code except **`Dynamic`**, which has no authorable output position and therefore cannot appear in a corpus bundle, and **`Markdown`**, **`Choice`** and **`Rating`**, which no pipeline fixture uses yet. `Dynamic` remains covered only by the pinned-list test; the other three were checked against a dry run of the vendored corpus entries that use them, which carry no committed spec.

That test fails in a confusing place — regenerating pipeline fixtures breaks a native-concepts unit test — so it carries a failure guide at the top of the file pointing at the catalog. Fix `conceptRefs.ts`, not the test.

Catching the drift _before_ it reaches a consumer — and for natives no bundle references — still needs tooling outside this repo.

The catalog's pinned fields are what the binding walk reads, not a schema: `ConceptInfo.json_schema` is optional and `nativeConceptInfo` has never populated it for any native, so a native's concept panel reads "Schema not available" where a pipelex-produced dry or live spec shows a field table.

## Authored Annotations

Static condition children show an outcome badge from `node.tags.outcome`. This
keeps the route label attached to the child card and survives layout changes and
folded controller cards.

Static batch graphs show a multiplicity badge on the representative branch in
expanded mode, and on the folded batch card when the controller is folded:

- `xN` for exact declared list multiplicity such as `Text[3]`
- `xmany` for unbounded list multiplicity such as `Text[]`
- `x?` when the list multiplicity cannot be inferred

A list-valued stuff carries its marker wherever the graph names its concept. The static builder writes `multiplicity` on every io item of a plural stuff — `true` for `Document[]`, the count for `Document[5]` — and leaves the key off a single-valued one, `Document[1]` included, because the standard reads a count of one as single. The renderer appends the marker to the concept on the stuff node, on the pipe card's pills and on the pipe detail panel's pills, and a stuff's own detail panel heads with `Document[]` and states that it is a list before the concept's description, which describes one item. A batch's item stuff is single and its aggregate is a list, as the runtime has them. Opening a concept from a pipe's pill shows the bare concept, since that view is about the type rather than a stuff. `validateGraphSpec` refuses a present `multiplicity` that is not a boolean, a positive integer or `null`, since a malformed one would otherwise display as single without a word. A graph produced by a run carries the same field from its producer: pipelex reads it off each stuff's value, writing `true` on every io item of a list — an empty or one-item list included — and `null` on a single value, and never an item count, so a run graph shows `Document[]` where the static graph of the same method may show `Document[5]`. The renderer takes the field as its producer wrote it and infers nothing from declarations or payloads, so a spec recorded by a producer that writes no `multiplicity` reads every stuff as single. The parity harness (`src/static-graph/__tests__/parityHarness.ts`) holds the two producers to each other: for every fixture pipeline, the stuffs the static builder marks as lists are exactly the ones the dry run marks, compared as list or single since only the static side can carry a declared count.

Producer-less `parallel_combine` targets are classified as combined stuff rather
than external inputs. This applies to both dry and static graphs.

## Condition Outputs

A `PipeCondition`'s output is one stuff that every outcome produces. Every outcome writes the condition's one slot, and only one of them runs, so a step after the condition reads that slot without knowing which outcome filled it. The static builder therefore mints the condition's output once, at `<condition node id>:<slot name>`, and renames each outcome's output onto it after walking the outcomes. When an outcome is itself a controller, the rename reaches the operator that wrote the stuff, and stuffs inside the outcome keep their own digests. The graph shows one card for the slot, with an edge from every outcome and an edge to every step reading it.

The shared stuff is typed by the outcomes when they all write the same concept and multiplicity, since that is the most precise true answer. When they differ, it is typed by the condition's declared output, since the slot then holds either and only the declaration covers both. Each outcome's own io item keeps the concept that outcome declares, so its card still shows what it produces. It is named like the default route's output when there is one, otherwise like the first producing outcome's. An expression alias (`add_alias_from_expression_to`) is a separate stuff typed `Dynamic`, at `<condition node id>:alias:<alias name>`, so an alias named like the slot never merges with the condition's output.

The renderer supports this with `DataflowAnalysis.stuffProducers`, which lists every operator writing each stuff. A stuff with several producers starts in the deepest controller holding all of them, which for a condition's output is the condition itself, and is then promoted like any other stuff until a step reading it is inside. Folding the condition makes its card the stuff's one producer.

A dry run does not emit this shape yet. pipelex runs every outcome into the same slot and keeps a separate digest per outcome, reporting the last outcome in sorted pipe-code order as the condition's output, so only that outcome is wired to a step reading the slot and the others dead-end at the graph's edge. The parity harness renames the dry outcomes onto the condition's output before comparing (its rule 6), which is the shape pipelex is to emit itself. A live run is unaffected: only the chosen outcome runs, and its output is the condition's.

## Binding Steps

A sequence step written `{ from = "invoice.total", result = "total_amount" }` runs no pipe: it stores the value at a path under a new name, for the steps after it to read. The static builder draws it as a run graph does, as a node of its own:

| Field | Value |
| --- | --- |
| `kind` | `"binding"` |
| `pipe_type` | `"BindingStep"` (`BINDING_STEP_TYPE`), the step's own class, never a pipe's |
| `pipe_code` | the `from` path |
| `description` | `Binds '<from>' to '<result>'` |
| `domain_code` | the sequence's domain |
| `execution_data` | `{ from, result }` |
| `io.inputs` | the root's stuff, under the root's name |
| `io.outputs` | the bound stuff, under the `result` name, at `<node id>:<result>` |

A `contains` edge joins it to its sequence, and the registry holds no entry for it, since no pipe declares it. The bound stuff is written into scope under its `result` name, so a later step reading that name is wired to the binding, and a binding that ends its sequence is the sequence's output, as the runtime stores it as the main stuff. A root nothing in scope holds draws a dangling input, as any unbound name does. Working memory is matched by exact name: an input is satisfied by a stuff of the same name, and by nothing else.

**What a binding binds is derived, never declared.** `src/static-graph/bindingWalk.ts` walks the path through the structures the method's concepts declare, as the runtime does, one segment at a time:

| The segment names a field declared as | The walk continues into, or the result is |
| --- | --- |
| `concept`, `concept_ref = X` | `X`, whose structure the next segment walks |
| `list`, `item_type = "concept"`, `item_concept_ref = X` | `X`, crossing a list |
| `text`, or no `type` (a field of `choices`), or a shorthand string | `native.Text`, a leaf |
| `number` or `integer` | `native.Number`, a leaf |
| `boolean` | `native.YesNo`, a leaf |
| `date` or `datetime` | `native.Date`, a leaf |
| `time` | `native.Time`, a leaf |
| `dict` | `native.JSON`, a leaf |
| `list` with a scalar `item_type` | that scalar's native, a leaf, crossing a list |

Crossing any list, or starting from a plural root, makes the result a list (`true`); a bare name keeps its root's concept and multiplicity. A refinement inherits the structure it refines. Natives are walked through their pinned fields, read off the [native concept catalog](#native-concepts): a single-field native (`Text`, `Number`, `Time`, `JSON`, `Markdown`) is a leaf a path may end on but never enter, and `Dynamic`, `Anything` and `Composite` have no structure. A concept declared with a description alone, one whose `structure` names a Python class, and one of a dependency have nothing a bundle shows, so a path cannot walk into them. A path the walk cannot follow binds `native.Anything` and reports a `binding-path-unresolved` warning naming the segment that failed and, where there is one, the fields available there.

**A dotted `batch_over` is a binding followed by the batch.** A pipe step batching over `catalog.pages` is held as the runtime holds it: a binding of the path under the private name `_bound_catalog_pages` (the path's dots as underscores, with `_2`, `_3`… appended when a name the sequence's inputs and steps write or read already holds that spelling), then the same step batching over that name, drawn as the usual `<pipe>_batch` controller. Steps are numbered in that runtime list, so a dotted `batch_over` takes two numbers: `…/step_1` is the binding and `…/step_2` the batch.

What the runtime refuses is reported with an `invalid-binding-step` warning: a step carrying both `from` and `pipe`, one with no `result`, a `result` that is not a plain name (`^[a-z][a-z0-9_]*$`, which also keeps the reserved `_bound_` prefix out of an author's reach), a `from` that is not a path of identifiers separated by dots, and, since only a sequence binds, a binding step or a dotted `batch_over` as a parallel branch. Each is skipped, as none names a value a later step could read. A pipe step's key carried beside `from` (`batch_as`, `nb_output`…) is reported and the binding still drawn.

**In a run graph** the same node arrives from pipelex. `validateGraphSpec` accepts the `binding` kind with `BindingStep` as its class, and refuses any other class on it, and `BindingStep` on a pipe-call node. The dataflow graph draws it as a pipe card between the root it reads and the value it binds, with a `Binding` badge and a dashed accent, and its detail panel says what it binds (`From`, `Result`) in every mode. It is drawn even when it carries no data flow: pipelex closes a binding whose root was absent with no input, and one that bound no single value with no output, skipped or failed, and such a card still sits in its sequence's group with its status and error. `NodePipeType` (`PipeType | "BindingStep"`) is the type of everything that names a card's class.

A binding's `pipe_code` is a path, which a pipe's code may spell (`from = "summary"` beside a pipe coded `summary`), so nothing keyed by pipe code ever reaches a binding: `pipeRefOf` returns nothing for it, so the value it binds is described through the pipe reading it, a validation issue keyed by `pipeRef` decorates only pipe nodes, a `statusMap` entry never sets a binding card's status, and clicking one calls no `onNavigateToPipe`. A card's detail panel finds its node by node id, which is also what tells two bindings of one path apart.

The corpus sweep asks more of the entries covering `feature.binding_step` than zero diagnostics: every sequence the walk reaches must draw one binding node per binding step it holds. It also reads the `invalid` entries authored to trigger a refusal this builder can see, `binding_step_invalid`, `binding_path_unresolved` or `invalid_input_name` (see [Input Slot Declarations](#input-slot-declarations)), and expects each to report the matching diagnostic and nothing else. The stories in `StaticBindingSteps.stories.tsx` draw two of those entries, and a screenshot test keeps their picture (see [Visual regression](#visual-regression)).

## PipeJudge and PipeDocGen

Both operators parse into registry blueprints shaped as pipelex serializes them, and draw as operator cards badged `Judge` and `DocGen`. A judge's question is read into `judgment_question`, whose `kind` is decided by what the pipe declares: `options` make a choice, `levels` a rating, and neither a yes/no question with its `criteria`. `prompt` is read in place of `question`, as the runtime reads it. A document generation step keeps its `format`, `model`, `template`, `template_file` and `filename`.

A document step's card shows its format beside its badge, as a chip in capitals (`PDF`, `XLSX`, `DOCX`, `PPTX`), in every mode. The format is read from the step's blueprint in `pipe_registry`, the one place all three modes carry it, never from the node: `buildPipeCardPayload` takes the blueprint `resolveNodeBlueprint` finds for the node and sets `docGenFormat` on the card's payload. A graph without a registry, or a bundle that omits the format, draws the card without a chip rather than guessing one. Its detail panel shows the format, the engine (the one the run resolved, else the one the step names, else the deck's default), what it prints from (the auto-layout of its inputs, an HTML template or a template file), its template, and its file name with, in a run, the name the document was stored under. It never shows the stored document's `url`, which a run's execution data carries: the document is the step's output and is shown as one, and an inlined one would be a wall of base64.

`resolveNodeBlueprint` is the one lookup the card and the detail panel share. A node carrying its domain resolves by its qualified ref and nothing else, since two domains may declare the same code; one without resolves in the pipeline's domain, then by the one registry key ending in its code, and by none when two do. A judge's card does not show its verdict yet.

`StaticDocGen.stories.tsx` draws the corpus entry `operator_doc_gen_door_notice` through the static builder. Its run-produced twin is `pipeline_35` (`DOOR_NOTICE`), where a `PipeLLM` writes a shop's hours up as a notice and a `PipeDocGen` prints it as a pdf from the auto-layout: its dry and live specs carry what pipelex actually serializes for the step, the registry entry, the execution data, and in the dry run the printed document inlined as a `data:` URL, and its stories check the card's chip and the panel's rows against them.

## Fixture Catalog

Storybook and tests expose `STATIC_*` specs and `STATIC_RUN_CATALOG` from
`src/graph/react/viewer/__stories__/staticGraphSpec.ts`. The catalog is built
from checked-in raw `.mthds` fixture bundles through the TypeScript static
builder. It does not require the Pipelex CLI, Python, a provider API key, or
network access.

Representative static-vs-live stories live in:

- `StaticGraphDev.stories.tsx`
- `StaticVsLive.stories.tsx`
- `StaticGraphInvalid.stories.tsx`

`StaticBindingSteps.stories.tsx` builds two entries of the vendored corpus (below) through the same builder, importing their `bundle.mthds` as raw text: `feature_binding_step_catalog_review`, the composite binding a catalog's title, the page view of every page, its cheapest price and its optional note around a batch, a judge and a compose, and `feature_binding_step_batch_over_catalog_pages`, a dotted `batch_over`.

### Visual regression

`*.screenshot.tsx` files render a story in Playwright Chromium, with the project annotations of `.storybook/preview.ts` so with Storybook's stylesheets, and compare it with a reference image committed beside the test under `__screenshots__/`. `StaticBindingSteps.screenshot.tsx` keeps the picture of both binding stories.

```bash
make test-screenshots    # compare with the references
make update-screenshots  # rewrite them after an intended change, then review the new images
```

They run from their own config, `vitest.screenshots.config.mts`, and so outside `make test` and CI. A reference is one platform's font rendering, named for it (`catalog-review-chromium-darwin.png`), and a machine of another platform has no reference to compare with: the first run there writes one and fails, asking for a review. The comparison is strict, since a dashed accent turned solid differs in too few pixels for any tolerance to see. On a mismatch, the actual and diff images land in `.vitest-attachments/`, which git ignores.

Three bundles exist specifically to give the native concepts fixture coverage, so that the sweeps which auto-discover `data/pipelines/pipeline_*` (parse, build, parity, and the corpus oracle above) actually see them:

| Directory     | Catalog entry          | What it covers                                                                                                                              |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipeline_32` | `MEETING_TRIAGE`       | `Date[]`, `Time`, and a bare `YesNo` as stuff nodes, plus a local concept refining a native — the four resolution paths, in one graph.      |
| `pipeline_33` | `AVAILABILITY_ROUTING` | The natives through the controllers: `batch_over` a native `Date[]`, and a `PipeCondition` on a native's structure field (`urgent.yes_no`). |
| `pipeline_34` | `ALL_NATIVE_CONCEPTS`  | One `PipeLLM` per remaining native output — `Number`, `Html`, `TextAndImages`, `JSON` — to lift the corpus oracle's coverage.               |

`pipeline_32` and `pipeline_33` carry real LIVE fixtures. They briefly could not: a `PipeLLM` outputting `Date`, `Date[]`, or `Time` failed validation because structured output delivers a date as a JSON string, so both shipped a placeholder LIVE spec (the DRY spec re-tagged). Fixed upstream in [pipelex#1089](https://github.com/Pipelex/pipelex/pull/1089) and regenerated; `make fixtures-live ONLY=pipeline_32` remains the end-to-end check that the temporal natives survive a live run.

## The vendored MTHDS Test Corpus

`data/mthds-corpus/` is a byte-identical copy of the MTHDS Test Corpus — the one canonical, tagged set of `.mthds` methods every repo in the workspace draws its language-level fixtures from. It is owned by `pipelex` (`pipelex/test_extras/mthds_corpus/`), where the corpus gates run, and it arrives here through the workspace's `mthds-corpus-sync` skill. **Nothing under `data/mthds-corpus/` is edited in this repo.** An entry that needs fixing is fixed in `pipelex`, where a change is checked against the vocabulary, the exhaustivity gate and the entry-validation gate; then the copy is re-synced. Editing it here would fork the corpus, which is the one failure mode the whole arrangement exists to prevent.

Why a copy at all, when the corpus ships inside the `pipelex` wheel: a TypeScript repo cannot read a Python wheel. Consumers that _can_ import `pipelex` use the wheel and keep no copy, so they are in lockstep by construction; the vendored channel exists for the cross-language repos.

**What it feeds, and what it deliberately does not.** The corpus carries methods and their manifests — no generated graph specs. So it feeds exactly the two sweeps that need nothing but the method text, and those two run over both piles through the shared discovery in `src/static-graph/__tests__/fixtureBundles.ts`:

- `parseFixtureBundles` — every file of every entry parses with no error diagnostics, fragments included.
- `buildFixtureGraphs` — the static builder turns each entry, merged, into a `validateGraphSpec`-clean spec, deterministically and with no diagnostics at all.

That is the valuable half. Running this repo's builder — a second, independent implementation of MTHDS — over the canonical corpus is precisely the cross-language conformance the corpus was built to provide.

`parity` and `nativeConceptsCorpus` keep reading `data/pipelines/` only, because both need a `dry_run_graph_spec.json` produced by actually running pipelex, and the corpus has none. **`data/pipelines/` is therefore not superseded and is not going away**; the two piles answer different questions, which is why `fixtureBundles.ts` keeps them apart rather than merging them into one list.

A fixture is a set of files, not a file. A multi-file entry keeps its library files beside the entry point — forward-declared signatures and the pipes that fill them — and those are fragments that only mean something merged, so both sweeps take every `.mthds` file in the entry directory. `parseFixtureBundles` reads them one at a time, because each file must parse on its own; `buildFixtureGraphs` passes the whole set in, with `bundle.mthds` (when there is one) leading so the merge is deterministic. Sweeping the entry point alone would build the corpus's multi-file entry into a one-node signature stub and report it as a pass.

The corpus brings operators and steps this builder has to keep up with: the binding entries are why it draws [binding steps](#binding-steps), and a judge or document generation entry is why it parses [PipeJudge and PipeDocGen](#pipejudge-and-pipedocgen).

That is also why `buildFixtureGraphs` tolerates no diagnostic whatsoever, warnings included. Every entry is a canonical, runnable method, and almost every diagnostic means the builder could not read what the method wrote — so on this material a warning and an error are the same news: either the builder has a gap or a fixture regressed. `unknown-input-slot-key` is the one exception and the one to watch, because it reports a slot the builder read perfectly: when the standard adds a slot-table key and pipelex ships a `valid` entry using it, this sweep goes red on a bundle nothing is wrong with, and the cure is to teach `INPUT_SLOT_KEYS` the new key. A `duplicate-pipe` warning would mean the merge stopped reading a signature and its concrete definition as one pipe; an `invalid-concept-ref` warning would mean a declared input silently vanished. Both pass every other assertion in the sweep, which is why severity is not the bar here.

**Only the entries the corpus marks `valid` are swept.** Each entry's `entry.toml` carries a `validity` of `valid` or `invalid`, and an invalid entry is surgically authored to trigger exactly one declared error — so under a zero-diagnostic rule it would report the corpus doing its job as a builder gap. This repo's declared slice takes the whole corpus rather than a filtered one (see the consumer registry in the `mthds-corpus-sync` skill), so the filter lives here, in `fixtureBundles.ts`. That red would be the mirror image of the vacuous green: a failure that means nothing, and that trains the next reader to loosen the gate. The one sweep that reads invalid entries is the refusal sweep described under [binding steps](#binding-steps), and it selects them by their `expected_error`, so it asks each only for the diagnostic it was authored to trigger.

**`validity` is the right axis here, and `fails_at` is not — measured against `pipelex` v0.51.0.** That release gave each non-excluded `error.*` vocabulary tag a `fails_at` of `schema` or `runtime`, naming the earliest layer of checking that rejects a bundle carrying the fault, and the contract's consumer rule is that a _structural_ sweep expects a diagnostic exactly on the `schema` ones. This builder is not a structural sweep. It resolves pipe references, so it sits between a schema check and the `pipelex` runtime, and it sees faults on both sides of that line: running it over every invalid entry, the two `schema` entries (`invalid_missing_pipe_type`, `invalid_unknown_pipe_type`) report diagnostics as the rule predicts — but so do two `runtime` ones, `invalid_pipe_code_syntax` and `invalid_unresolved_pipe_dependency`, each on an unresolvable `main_pipe` or step. Branching on `fails_at` here would therefore go red on those two. `validity` stays the filter, and the fact that four entries produce diagnostics is what makes it load-bearing rather than decorative.

A directory holding no `.mthds` file at all throws, rather than dropping silently from the sweep — and so does an entry whose manifest is missing, unreadable, or carries a validity the contract does not define, because an entry the helper cannot classify is an entry it would otherwise drop unnoticed.

## Limitations

- Static graphs are not execution proof. Validation and dry runs still own
  executability.
- Runtime data, rendered prompts, timings, metrics, and live statuses are absent.
- Batch graphs render one representative branch, not sampled fan-out.
- The builder renders methods as authored; it does not mirror runtime
  elaboration rewrites such as possible preliminary-text expansion.
- Dependency refs without bundled source render as opaque `PipeSignature` leaves.
