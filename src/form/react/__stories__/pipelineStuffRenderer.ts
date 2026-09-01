import { renderStuffResult } from "@form/react/StuffResultPanel";
import type { RenderStuffData } from "@graph/react/stuffRender";
import { ARTIFACT_SETS } from "./contracts/_generated.contracts";

/**
 * The `renderStuffData` a per-pipeline graph story wants, by method name.
 *
 * ## Why this lives under `src/form/`
 *
 * The 34 `Graph - from run/NN …` stories are `./graph/react` stories, and that
 * entry may not import `@pipelex/mthds-form` — it is an optional peer isolated
 * behind `./form/react`, and `eslint.config.mjs` pins the boundary. This module
 * is on the form side, so it may; a graph story importing THIS is importing our
 * own module, and stories live outside `tsup.config.ts`'s entry globs so none of
 * it reaches the shipped graph bundle.
 *
 * ## Why the stories carry it at all
 *
 * Clicking a data node in one of those graphs and getting only a schema table is
 * the wrong answer to "what happened in this run?". Every one of these specs is
 * a real (or dry) run of a bundle whose artifacts this repo also generates, so
 * the panel can show what each step actually produced — and for the method's own
 * inputs, what it was actually given. `Form/Graph with ResultPanel` shows the
 * wiring on purpose; these show it everywhere, which is what a host would do.
 *
 * A method whose artifacts are missing gets `undefined` rather than a renderer
 * that returns nothing: passing nothing is the viewer's own documented "no data
 * view" path, so the fallback is the panel's floor rather than a second one.
 */
export function stuffRendererFor(methodName: string): RenderStuffData | undefined {
  const artifacts = ARTIFACT_SETS[methodName];
  return artifacts ? cached(methodName, artifacts) : undefined;
}

// Memoized per method: `renderStuffResult` closes over the artifacts, so a fresh
// call on every render would hand `GraphViewer` a new function identity each
// time — harmless today, and exactly the kind of thing that turns into a render
// loop the moment someone adds it to a dependency array.
const CACHE = new Map<string, RenderStuffData>();

function cached(name: string, artifacts: (typeof ARTIFACT_SETS)[string]): RenderStuffData {
  const hit = CACHE.get(name);
  if (hit) return hit;
  const made = renderStuffResult(artifacts);
  CACHE.set(name, made);
  return made;
}
