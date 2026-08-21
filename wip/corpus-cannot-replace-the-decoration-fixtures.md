# Why the validation-decoration stories keep hand-authored bundles

Recorded 2026-08-21, when the MTHDS Test Corpus was re-synced onto `pipelex` v0.51.0 and the corpus work's remaining item for this repo was "retire the hand-authored invalid-bundle case in favour of a corpus one". It was measured rather than assumed, and the answer is that it should not be done. This note exists so the item is not re-opened on the strength of how reasonable it sounds.

## What was measured

Every `validity = "invalid"` entry in the vendored corpus was run through `buildStaticGraphSpecFromToml` and its diagnostics projected through `staticDiagnosticsToValidationIssues`, which is exactly the path the decoration stories drive. Most entries produce **no static diagnostics at all** — their declared faults are semantic and this builder never gets near them. Four produce something:

- `invalid_missing_pipe_type` and `invalid_unknown_pipe_type` — an `unknown-pipe-type` error on the offending pipe, then `no-entry-pipe: no pipes found in any bundle`. The pipe is skipped, and with the only pipe skipped the graph comes out **empty**.
- `invalid_pipe_code_syntax` — one warning, on an unresolvable `main_pipe`, with no path at all.
- `invalid_unresolved_pipe_dependency` — a two-node graph and one `unresolved-pipe-ref` warning carrying a node-id path.

## Why none of them is a replacement

The stories need two different things, and the corpus supplies neither well.

`data/static/garments_from_moodboard/bundle_with_error.mthds` is a large realistic method that four stories use as a **graph to decorate**: rings and badges land on three distinct named pipes, with hand-written validator-origin issues layered on top. Nothing in the corpus resembles it — a corpus entry is deliberately small and single-fault — and the two entries whose faults this builder can see render no nodes whatsoever. There is nothing to decorate.

The inline `brokenBundle` in `ValidationDecorations.stories.tsx` is the closer call, and it still fails. It exists to exercise **both** targeting paths at once: `pipe.summarize.output` auto-qualifies into a `pipeRef` and decorates a node that is actually rendered, while the unresolved third step yields a `nodeId` on a node the walk skipped, so it stays in the panel. `invalid_unresolved_pipe_dependency` produces only the second of those. Swapping it in would silently drop the auto-qualified `pipeRef` decoration — the primary behaviour the story demonstrates — from the coverage.

## The deeper reason, which generalises

A corpus entry's contract is its **declared runtime fault**, not the static diagnostics it incidentally emits on the way there. Those diagnostics are a side effect, and upstream is free to re-theme or re-shape an entry as long as the declared fault survives. Pinning a presentation story to them would make this repo's stories breakable by an upstream edit that the corpus contract considers a no-op — which inverts the whole point of vendoring, and is the same class of mistake as pointing a vendored copy at a snapshot suite.

## What the corpus does cover here

The valid slice, which is the cross-language conformance the corpus was built for and already runs. The invalid slice's contribution to this repo is that the `validity` filter is now demonstrably load-bearing: four entries would red the sweeps if it were removed. That measurement is recorded in `docs/static-graph.md`, together with why `fails_at` is the wrong axis to switch the filter onto.
