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

| Mode | Source | Purpose | Runtime chrome |
| --- | --- | --- | --- |
| `static` | Authored `.mthds` TOML via `src/static-graph/` | Method structure preview | Hidden |
| `dry` | Pipelex dry-run trace | Executability and mocked run structure | Shown |
| `live` | Pipelex live trace | Actual run state and data | Shown |

Static cards do not show status dots, pulse animation, or status titles.
Static pipe details hide status, duration, metrics, and execution-data dumps.
They keep authored blueprint sections, IO, concept links, descriptions, static
tags, and errors/diagnostics when present.

`statusMap` overlays are ignored for static cards. Live-status overlay onto a
static graph needs a separate identity-mapping design because repeated
invocations can share a `pipe_code`.

## Authored Annotations

Static condition children show an outcome badge from `node.tags.outcome`. This
keeps the route label attached to the child card and survives layout changes and
folded controller cards.

Static batch graphs show a multiplicity badge on the representative branch in
expanded mode, and on the folded batch card when the controller is folded:

- `xN` for exact declared list multiplicity such as `Text[3]`
- `xmany` for unbounded list multiplicity such as `Text[]`
- `x?` when the list multiplicity cannot be inferred

Producer-less `parallel_combine` targets are classified as combined stuff rather
than external inputs. This applies to both dry and static graphs.

## Fixture Catalog

Storybook and tests expose `STATIC_*` specs and `STATIC_RUN_CATALOG` from
`src/graph/react/viewer/__stories__/staticGraphSpec.ts`. The catalog is built
from checked-in raw `.mthds` fixture bundles through the TypeScript static
builder. It does not require the Pipelex CLI, Python, a gateway key, or network
access.

Representative static-vs-dry stories live in:

- `StaticGraphDev.stories.tsx`
- `StaticVsDry.stories.tsx`
- `StaticGraphInvalid.stories.tsx`

## Limitations

- Static graphs are not execution proof. Validation and dry runs still own
  executability.
- Runtime data, rendered prompts, timings, metrics, and live statuses are absent.
- Batch graphs render one representative branch, not sampled fan-out.
- The builder renders methods as authored; it does not mirror runtime
  elaboration rewrites such as possible preliminary-text expansion.
- Dependency refs without bundled source render as opaque `PipeSignature` leaves.
