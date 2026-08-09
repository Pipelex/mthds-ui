# Deferred: a concept named `toString` crashes the static builder

Found while reviewing `feature/New-native-concepts` (PR #64). **Pre-existing** — the offending line is unchanged context in that diff, and the branch neither caused it nor made it worse. Written up rather than fixed because it is outside that PR's scope and wants its own change with its own test.

## What happens

`buildStaticGraphSpecFromToml` **throws** on a bundle whose concept ref is the name of an `Object.prototype` member. Reproduced on `toString`, `constructor`, `valueOf`, `hasOwnProperty`, and `__proto__`:

```toml
domain = "d"
main_pipe = "p"

[pipe.p]
type = "PipeLLM"
description = "x"
inputs = { a = "Text" }
output = "toString"
prompt = "hi"
```

→ `TypeError: Cannot read properties of undefined (reading 'replace')` in `snakeCase` (`buildStaticGraphSpec.ts:309`), reached from `finishLeaf` (`:598`) ← `walkPipe` (`:560`) ← `buildStaticGraphSpec` (`:87`).

That breaks a contract both modules state in their headers: `conceptRefs.ts:7` — "Anything unresolved becomes a best-effort stub — this module never throws on content"; `parseMthdsBundle.ts:7` — "It never throws on content". A preview surface that exists to render half-written files should degrade to a stub and a diagnostic, never take the whole graph down with an exception.

## Why

`resolveConceptInfo` reads the local-concept map with a bare index, so the lookup walks the prototype chain:

```ts
const local = localConcepts[parts.code];
if (local) return local;
```

`localConcepts["toString"]` is `Object.prototype.toString` — a function, therefore truthy, therefore returned as if it were a `ConceptInfo`. It has no `.code`, and the builder dies the moment something reads one. `parseConceptRef`'s grammar admits these names: the code group is `[A-Za-z0-9_]+`, with no PascalCase or reserved-word constraint.

`qualifyRefines` in `parseMthdsBundle.ts` is not affected — it tests membership through `declaredCodes`, a `Set`.

## Fix

Guard the read the same way the catalog lookup three lines above already does (`isNativeConceptCode` uses `Object.hasOwn`):

```ts
const local = Object.hasOwn(localConcepts, parts.code) ? localConcepts[parts.code] : undefined;
if (local) return local;
```

Building the `concepts` map with `Object.create(null)` in `parseConcepts` would also work, but it is the larger change and it leaves the read site unsafe for any other caller — `resolveConceptInfo` is exported and takes a caller-supplied map. The `Object.hasOwn` guard at the read site is the smaller, more local fix.

Add a test next to the shadowing test in `nativeConcepts.test.ts` (or in `parseConceptRef.test.ts`): a bundle with `output = "toString"` must produce a stub concept and no throw.

## Worth deciding at the same time

Whether `parseConceptRef` should constrain the code grammar at all. MTHDS concept codes are PascalCase by convention, but nothing in this repo enforces it — `output = "yesno"` parses today and yields a stub concept named `yesno` with no diagnostic. If a `malformed-concept-ref` diagnostic is wanted, it belongs in the same change as the guard, and it interacts with the `shadows-native-concept` diagnostic proposed in `native-concept-shadowing.md` §2 — both are "this ref names something it should not" and should read consistently.

Reachability is low: it takes an author naming a concept exactly `toString`, `constructor`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, or `__proto__`. That is why this is a deferral and not a hotfix. But the failure mode is the worst one this module has — a hard throw where every other malformed input produces a diagnostic — so it should not sit indefinitely.
