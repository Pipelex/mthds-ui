# Deferred: what the independent `/review` sweep raised and this PR did not change

Raised by the gstack `/review` sweep run over PR #75 after both bots went clean on `13a330c` — a fresh reviewer with no inherited context, fanned out over specialist passes and one adversarial pass. Two of its findings were fixed in the branch: the `.catch()` placement and the missing `aria-describedby`. These are the ones left alone on purpose, each with the reason, so the next session does not have to re-derive the argument or re-discover the trade-off.

A third was applied by the sweep and then **reverted** on arbitration — the Run button's hardcoded `#ffffff`. Measuring what the proposed token actually resolves to turned a tidy-up into a visual change to the default theme's primary button, and revealed that the underlying contrast defect is bigger than the one reported and is not fixed by that swap. It has its own note: `deferred-run-button-contrast.md`.

The generator-side residues from the same sweep are in the sibling `deferred-fixture-generator-hygiene.md`; the cross-repo one is filed at `../wip/inbox/2026-08-23-mthds-form-inherited-prototype-key-reads-as-filled.md`.

## 1. The values mirror does not converge when the host declines an update

`handleDropFile`'s continuation advances `valuesRef.current` itself before handing the values to the host, and the comment beside it says the effect "still owns syncing FROM the host, so the mirror converges on whatever the host actually kept." That sentence is not true in one case, and the sweep was right to name it: the re-sync effect is keyed `[values]`, so a host that ignores the update — a read-only guard, a filter, a dropped debounce, a throw inside `onValuesChange` — never changes the identity, the effect never re-runs, and the mirror stays ahead permanently. The next accepted upload then merges onto a base carrying a value the host rejected, and resurrects it.

**Not changed, because the synchronous advance is round 5's fix and the alternative is round 5's bug.** Two uploads settling in one React batch both run before any re-render; the advance is what stops the second write dropping the first, on an ordinary two-file form. Rolling the mirror back on a declined update means detecting a decline, and the panel cannot: `onValuesChange` returns `void`, so "the host kept it" and "the host silently dropped it" are indistinguishable from here.

The honest framings of the residue are that the _comment_ overclaims, and that "fully controlled" already means the host applies what it is handed. A host that declines an update is outside the contract, not inside it. If this is ever revisited the shape is probably not a rollback but making the contract explicit — the prop documented as "must apply the values it is given", or `onValuesChange` returning the values it actually kept.

## 2. `defaultValidationTranslate` throws on a key the kernel adds later

```ts
const template = VALIDATION_STRINGS[key];
if (!values) return template;
return template.replace(/\{(\w+)\}/g, …);
```

`VALIDATION_STRINGS` is `Record<ValidationMessageKey, string>`, so the compiler guarantees every key of the union has a string — today, against the pinned kernel. It cannot throw here, and this repo can never go red on it, because `devDependencies` pins `0.2.0` and the type and the table agree by construction.

A consumer is not in that position. `peerDependencies` declares `^0.2.0`, so a host may resolve `0.2.x` with a validation-message key this package's built JS has never heard of. `template` is then `undefined`, and `.replace` throws on the submit path, inside `runSubmitGate`, on a Run click, with no `try` anywhere in `src/form/` to contain it.

**Not changed, because it cannot happen with the pinned kernel and the fix is a guard against an unreachable state**, which is the kind of defensive machinery this repo has been deliberate about not accumulating. Recorded rather than written because the reasoning is not obvious from the code: this is the same structural blind spot `contracts-fixture-reshape-obligation.md` already names — the two sides agree, which is exactly why nothing here can detect the pairing going wrong.

If it is taken, it is one token — `const template = VALIDATION_STRINGS[key] ?? key;` — which turns a crash into a degraded message showing the raw key. That is a better failure than a thrown submit, and the moment to decide is the kernel bump, alongside the fixture reshape.

## 3. Splitting `env` ownership silently voids the upload gate

```ts
onDropFile: env?.onDropFile ?? (uploadFile ? handleDropFile : undefined),
uploadingIds: env?.uploadingIds ?? uploadingIds,
```

These default independently per key, which is the documented "the host's value wins PER KEY" contract — but they are one mechanism, not two settings. A host that supplies `env.onDropFile` alone, the natural move for a host that already owns an upload pipeline, leaves the panel's own set empty forever. `uploading` is then permanently false: Run stays live through every upload, and the kernel's `disabled: disabled || uploading` never fires so the dropzone stays open. That is the round-1 defect restored through a door the round-1 fix does not cover.

**Not changed, because `docs/run-form-panel.md` already states the requirement** — pass `env.onDropFile` _and_ `env.uploadingIds` — so this is an enforcement gap, not a contradiction. Closing it means a `process.env.NODE_ENV !== "production"` warning when exactly one of the pair is supplied, and a dev-only console warning is a new kind of thing for this library: there is no other one, and `no-console` is an eslint error here, so it would need an explicit exemption. Worth doing if a host trips over it; not worth inventing the category speculatively.

## 4. A never-settling `uploadFile` wedges the form

Nothing un-marks a field except the continuation. There is no timeout, no `AbortController`, no cancel affordance, and `fetch` has no default timeout — so a hung connection is ordinary rather than exotic. The id stays in `uploadingIds`, `blocked` stays true, the field's dropzone stays disabled so it cannot even be retried, and the only escapes are a contract change or an unmount. Each hang also retains its closure for the page's lifetime.

**Not changed, and this one is closest to being correct as it stands.** The panel owns no transport by design — no API client, no upload, no storage resolution, the host injects all three — and a timeout is a transport policy. A host that knows its storage backend knows what "too long" means; the panel does not, and any number it picked would be wrong for someone. The host can already implement it entirely on its own side, by racing its own timeout inside `uploadFile` and rejecting, which the panel handles.

What would change the answer is evidence that hosts do not do that and users get wedged forms. The affordance to add then is not a timeout but a cancel: surfacing a way to clear a field's in-flight mark, which is the panel's own state and therefore genuinely its job.

## 5. Three untested branches

The sweep found the story coverage genuinely absent in three places, and it verified `src/form/runGate.ts` is at 100% on all four counters, so these are render-path gaps only:

- **The zero-inputs empty state** — `This pipe takes no inputs.` has no story. `runGate.test.ts` covers the gate for a contract with no inputs, but nothing renders the branch.
- **`commitValues` clearing `submitError` on an ordinary edit** — `SubmitErrorClearedOnPipeSwitch` pins the contract-switch sibling of this behaviour, and `InvalidSubmit` pins the alert appearing, but nothing types into a field afterwards to watch it go. That asymmetry is the round-4 and round-9 shape exactly: a behaviour covered in one place and not in its twin.
- **The `.dark` theme bridge** — Decision D's deliverable, verified visually per the workflow rule but never asserted, so a regression in the class toggle would not fail the suite.

**Not added, because this PR is eleven rounds deep, green on both bots, and these are additive coverage rather than defects** — no behaviour here is unverified, only unpinned. Against that, three more browser stories lengthen a suite the repo already documents as load-flaky at 130+ story files. The second one is the one worth doing first if any are: it is the twin of a case that was thought worth pinning.
