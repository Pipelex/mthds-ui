# PR #56 review follow-ups (deferred)

Deferred items from the SWE-agent review triage of the v0.13.0 release PR (https://github.com/Pipelex/mthds-ui/pull/56). Confirmed-real but low-impact; deferred to keep the release change minimal.

## Condition routes should dedupe by resolved pipe identity, not authored spelling

- **Reporter:** Codex (chatgpt-codex-connector), P2 — thread: https://github.com/Pipelex/mthds-ui/pull/56 (unresolved review comment on `src/static-graph/buildStaticGraphSpec.ts`)
- **Location:** `src/static-graph/buildStaticGraphSpec.ts` — `finishCondition`, the `byRef` route-accumulation map (~line 746).

### Issue

`byRef` keys condition routes by the raw authored ref string. `resolvePipeRef` resolves both a bare ref (`handler`) and a self-qualified ref (`mydomain.handler`) to the same blueprint when the condition lives in `mydomain`, so a condition mixing the two spellings for the same target emits **two** RouteEntries → two child nodes (distinct `outcome_*` ids) with the target subtree walked twice. That violates the documented one-child-per-distinct-target contract (`docs/static-graph.md`, "one child per distinct target"; same statement in the in-code comment above the map).

### Why deferred (secondary)

- Only reachable when an author redundantly self-qualifies their own domain in one outcome while leaving another bare, within a single condition — a self-inconsistent pattern no fixture uses. A bare ref only resolves in the current domain, so cross-domain qualified refs can never alias a bare one.
- The realistic aliasing case — `default_outcome` repeating a named outcome's exact spelling — already merges correctly via the same-key path.
- Best-effort module by design: the symptom is a duplicated branch render, no crash or corruption.

### Recommended fix (when picked up)

In `addRoute`, key `byRef` by resolved identity instead of the raw ref (keep `entry.ref` as the first authored spelling for the walk):

```ts
const resolution = resolvePipeRef(ctx.set, ref, blueprint.domain_code);
const key =
  resolution.kind === "resolved" ? `${resolution.domain}.${resolution.code}` : `raw:${ref}`;
```

The `raw:` prefix keeps opaque (`alias->…`) and unresolved refs distinct from each other and from resolved identities, so only refs resolving to the same real pipe merge.

**Tests** (in `src/static-graph/__tests__/buildStaticGraphSpec.test.ts`, condition outcome-merging describe block):

1. Same-domain condition with `outcomes = { a = "handler", b = "mydomain.handler" }` → exactly one child resolving to `handler`, `tags.outcome === "a | b"`, one `contains` edge to it.
2. Guard against over-merging: two distinct unresolved refs still yield two children.
