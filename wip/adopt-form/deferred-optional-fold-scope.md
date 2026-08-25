# Deferred: is the optional fold a per-form state or a viewing preference?

Raised by Codex in review round 11 of PR #75, as "Reset optional expansion when switching contracts". The observation is correct; the disposition is not obvious, so the behaviour is left as it is and the question is written down instead of guessed at.

## What is true

`showOptional` is `React.useState(false)` in `RunPanel`, and the `[contract]` layout effect resets `uploadingIds` and `submitError` but not it. So a host that reuses one panel instance across pipes — the documented graph-selection integration, where clicking a node swaps `contract` — carries an expanded fold from one pipe into the next. Pipe B shows its empty optional inputs expanded although the user only ever expanded pipe A.

## Why it was not simply reset

The suggestion was to reset it "alongside the upload and error state", and that analogy is the part worth resisting. Those two are reset because they carry **content about the pipe the user left**: `submitError` names fields that are no longer on screen, so it is a complaint about a form nobody is looking at, and `uploadingIds` holds field ids whose upload belongs to another form, so it gates Run over a file this form never asked for. Both are wrong the instant the contract changes. `showOptional` is a bare boolean that means the same thing in every form — "I want to see optional inputs" — and is not stale in any pipe.

Read that way it is a viewing preference, and viewing preferences conventionally persist: "show advanced settings", "show hidden files". A user clicking through pipes in a graph specifically to compare their optional inputs would have to re-expand on every single click if it reset, which is a worse experience than the one being reported.

**The asymmetry that actually decides it: persistence is recoverable by the host and reset is not.** A host that wants the fold to reset per pipe writes `<RunPanel key={pipeRef} …>`, which is the ordinary React idiom and already supported (round 8 made the upload lifecycle honour it). A host that wants the fold to persist has no equivalent move if the panel hard-resets it, because the panel owns the state and exposes no prop for it. Resetting removes a capability; keeping it preserves both.

No correctness issue rides on this either way. Nothing about the payload, the readiness verdict or the gate depends on `showOptional` — it filters `visibleFields`, and a field hidden by the fold is by construction an empty optional, which the wire format omits regardless of whether it was on screen. And there is no trap in the edge case: when a pipe has no foldable field the toggle is not rendered, but `visibleFields` is then the same list under either value.

## What would settle it

Real use. If the graph-selection integration in a product shows people being surprised by an expanded form they did not expand, reset it — and reset it in the `[contract]` effect, exactly where the suggestion put it. If instead people click through pipes with the fold open, this is already right. Until one of those is observed, this is a preference being argued from first principles by two parties who both have a case.

If it is ever changed, the honest version is probably not a hard reset but a `defaultShowOptional` prop, which would let a host state its intent instead of inferring it from a keying decision made for other reasons.

## A related wart the round-22 fix leaves behind

Round 22 made the toggle count what a collapse WOULD hide (every empty optional) rather than what is hidden right now, and made the toggle's own handler clear the reveal latch. Together those let an optional the user empties fold away again instead of sitting in the form permanently.

One state is left slightly wrong, and it is worth writing down so the next reviewer does not spend the afternoon rediscovering it. When the fold is **collapsed** and a **host pre-filled** optional is then emptied, the field is on screen (the latch holds it) while the toggle reads "Show 1 optional input" — an offer to reveal something already visible. Clicking once expands (no visible change), clicking again collapses and folds it away, so the user is not stuck; the label is just briefly untrue.

Reaching it needs the host to pre-fill an optional through `values`, because the user cannot get there alone: filling the only optional removes the toggle, so there is no way to collapse the fold over a filled optional by hand.

Fixing the label properly means the toggle stops being one boolean — it would have to offer "hide" from a collapsed fold whenever the latch is holding something empty, which is a third state in a two-state control. That is a bigger change to the control's meaning than the wart justifies, and the control belongs to the kernel (`OptionalToggle`), not to this repo. If it is ever worth doing, it is a kernel-side conversation about what the toggle represents, not a patch here.
