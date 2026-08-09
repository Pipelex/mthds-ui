# Deferred: native-concept shadowing, and the natives' pinned structures

What the native-catalog fix (`feature/New-native-concepts`) deliberately left alone. Each was raised in that PR's review; none is a regression it introduced, and each needs a decision rather than a patch.

## 1. Bare refs resolve local-before-native; the spec says the opposite

`conceptRefs.ts` `resolveConceptInfo` checks `localConcepts` before the native fallback, and `parseMthdsBundle.ts` `qualifyRefines` does the same. `mthds/docs/spec/namespace-resolution.md` ("Resolution Order for Bare Concept References") puts natives first: _"Native concepts always take priority."_

The divergence is only reachable on a bundle that is **already invalid**: `mthds/docs/implementers/validation-rules.md` says a bundle MUST NOT declare a concept whose code is a native's, and a compliant implementation MUST reject it. So the disagreement is confined to files `pipelex validate` refuses. mthds-ui is at least internally consistent — both call sites resolve the same way — and there is a test pinning the behavior (`nativeConcepts.test.ts` → "a locally declared concept shadowing a native").

Adding `YesNo` / `Date` / `Time` widened the set of names an author can collide with, which is what makes this worth writing down rather than shrugging at. `Date` in particular is a name a scheduling domain will reach for.

The same two lines carry a separate, harder defect: the local lookup is a bare index, so a concept ref naming an `Object.prototype` member (`toString`, `constructor`, `__proto__`) resolves to a prototype value and crashes the builder rather than stubbing. Written up on its own in `static-graph-prototype-key-crash.md` — different failure class (a throw, not a wrong render), but whoever touches this block should fix both at once.

## 2. No diagnostic when a bundle declares a native-named concept

Same root, other half. `parseConcepts` accepts `[concept.Date]` silently. The static graph renders it; `pipelex validate` rejects the file. The preview and the validator therefore disagree about whether the bundle is even legal, and the author gets no hint from the graph.

`parseConcepts` already pushes `invalid-concept-entry` from inside the very loop over the declared codes where a reserved-code check would go, so the lenient-diagnostic machinery is right there and simply not wired for reserved codes. (Not `duplicate-concept` — that one lives in `mergeBundles.ts` and fires only when two bundles in the same domain declare the same code. A code declared twice inside one file never reaches it: `smol-toml` rejects the redefinition and `parseMthdsBundle` turns the whole file into a single `toml-parse-error`.)

## The choice between them

Two ways out, and they are not equivalent:

- **Flip precedence to native-first.** Matches the spec's letter. But it makes the graph silently ignore something the author explicitly wrote, which is the worse failure for a preview surface — the whole point of the static graph is to render what is on the page.
- **Emit a `shadows-native-concept` diagnostic and keep resolving local-first.** Tells the author their bundle is invalid _and_ keeps showing them what they wrote. This is the better of the two: the static graph is a preview, not a validator, and a diagnostic is exactly how it says "this will not survive `validate`".

Recommendation: the diagnostic. It needs a new code in `src/static-graph/types.ts`, emission in `parseConcepts`, a test, and a line in `docs/static-graph.md`. Not large, but it changes what hosts see in `diagnostics[]`, so it wants its own change rather than riding along in a catalog fix.

## 3. Natives carry no `json_schema`, so their panels read "Schema not available"

`nativeConceptInfo` has never populated `ConceptInfo.json_schema`, for any native — so `ConceptDetailPanel` shows "Schema not available" on every native concept, while the same concept from a pipelex dry or live spec shows a full field table. On a static-vs-live comparison the two halves visibly disagree.

The standard pins a structure for each native (`mthds/docs/spec/native-concepts.md`), and pipelex mirrors them in `pipelex/core/concepts/native/pinned_blueprints.py`, so the data exists and is copyable. Doing it for a subset would be worse than not doing it — the fix is the whole catalog at once, and it is a bigger copy than the description table: fields, types, required flags, and the `concept_ref` cross-links (`TextAndImages` → `Text` / `Image`, `Page` → `TextAndImages` / `Image`, `SearchResult` → `Document`).

Worth pairing with a decision about the description strings too. `docs/static-graph.md` tells maintainers to copy the wording verbatim, and it currently is verbatim, but nothing mechanically holds it there. If the structures get copied, both they and the descriptions become large hand-copies of an upstream artifact — at which point generating the whole table from pipelex (the way `pipelex-js` drives its native table from an oracle script) beats maintaining it by hand. See `pipelex/wip/native-concept-codes-drift-invisible.md` for the tooling side of the same problem.

There is a cheaper in-repo option worth considering first, raised in PR #64's review and deliberately not taken there. The committed pipeline fixtures are an **independent oracle for the wording**: `data/pipelines/*/dry_run_graph_spec.json` is pipelex output, so every `concept_registry` entry with `domain_code === "native"` carries pipelex's own description. A test in the `parity.test.ts` style (`PIPELINES_DIR` + `readdirSync`) could assert each one equals `nativeConceptInfo(code).description`, guarded by a non-empty count so it cannot go vacuous. Unlike pinning the fifteen strings in a second hand-written list — which PR #64 declined, correctly, as a copy of the copy — this compares against something the repo did not author, so it would also catch an upstream rewording the moment someone runs `make fixtures`. Two caveats decide whether it is worth it: coverage is incidental (only the natives that happen to appear in the corpus, currently `Anything`, `Composite`, `Document`, `Image`, `Page`, `SearchResult`, `Text` — none of the three this PR added), and it fails in a confusing place, since regenerating pipeline fixtures would break a native-concepts unit test. Take it as a stopgap only if the generated table in the paragraph above is not going to happen soon.

## 4. `SchemaTable` renders only a field's `type`, dropping everything that qualifies it

Same panel, adjacent hole. `extractType` in `ConceptDetailPanel.tsx` returns `schema.type` and nothing else, so the type column shows a bare `string` / `array` / `object`. `parseMthdsBundle`'s `fieldSchema` emits four qualifiers the panel never reads:

- `format` — `date`, `date-time`, and `time` all render as `string`, indistinguishable from `text`.
- `enum` — an authored `choices = [...]` list is dropped entirely. Arguably the biggest information loss of the four: the author wrote a closed set and the panel shows an open one.
- `items` — a `list` field renders as bare `array`, never `array<string>`.
- `default` — an authored `default_value` never surfaces.

Raised by a review bot on PR #64 against the temporal-format fix, framed as "the display fix is ineffective". Half right: the emitted data was genuinely wrong for `date` and missing for `datetime` / `time`, and correcting it is what a host consuming `GraphSpec.concept_registry` needs. But it does not change a pixel here, and the changelog was corrected to stop implying otherwise.

Deliberately not fixed in that PR. The two-line version — append `format` to the type cell — is arbitrary: nothing justifies surfacing `format` while `enum` stays hidden. The non-arbitrary version is "the type column renders the field's derived shape", which is a design pass on that column and its CSS, changes rendering for every dry and live fixture rather than just static ones, and therefore needs the Storybook visual pass under Workflow Rule 2. It should also land after §3, not before: a panel that shows no schema at all for natives is the larger gap in the same component, and polishing the type column while that waits is out of order.
