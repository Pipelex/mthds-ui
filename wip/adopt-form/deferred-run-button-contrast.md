# Deferred: the Run button's label is below WCAG AA in both palettes

Surfaced by the independent `/review` sweep over PR #75, as "the Run button hardcodes `#ffffff` instead of using the token layer". The tokenization observation is correct and the sweep applied it. **It was reverted**, because measuring what the token actually resolves to turns a tidy-up into a design decision, and because the underlying defect it half-fixes is real and needs settling properly rather than by accident.

## What was measured

`.mthds-run-panel-run` is `background: var(--color-accent-strong)` with a 13px/600 label, so WCAG AA wants 4.5:1. Both palettes are in `src/graph/graphConfig.ts`.

**Which palette applies is a panel question, not a `:root` question**, and getting that backwards is easy: `graph-core.css` writes the DARK set into `:root`, but `RunPanel` defaults `theme = GRAPH_THEME.LIGHT` and writes `getPaletteForTheme(theme)` as inline styles on its own `<form>`, which beat `:root`. **A `<RunPanel>` given no `theme` prop is therefore light.**

| Palette               | Background (`--color-accent-strong`) | Label                          | Ratio  | AA (4.5:1) |
| --------------------- | ------------------------------------ | ------------------------------ | ------ | ---------- |
| Light — panel default | `#0284c7`                            | `#ffffff` — what ships         | 4.10:1 | fails      |
| Light — panel default | `#0284c7`                            | `--text-on-accent` → `#ffffff` | 4.10:1 | fails      |
| Dark — `theme={DARK}` | `#3b82f6`                            | `#ffffff` — what ships         | 3.68:1 | fails      |
| Dark — `theme={DARK}` | `#3b82f6`                            | `--text-on-accent` → `#0e0e0e` | 5.25:1 | passes     |

So the shipped button fails AA in **both** themes. That is the real finding, and it was not the one reported.

## Why the token swap was not kept

**`--text-on-accent` is calibrated for a different colour.** It pairs with `--color-accent` — `#8be9fd`, a pale cyan, in the dark palette — where near-black text is the obvious choice. `--color-accent-strong` is a medium blue, and the Run button is the **only** place in the repo that puts text on it (`grep "background: var(--color-accent-strong)"` returns one hit). There is therefore no existing pairing that makes adopting the token "consistency"; it is a new pairing, inheriting a value chosen for something else.

**It fixes the theme the panel does not default to, and does nothing for the one it does.** In dark the token happens to resolve to near-black and clears AA; in light — the panel's default, and so the case most hosts get — it resolves to white and changes nothing at all. A change that repairs half a defect while reading as a cleanup is worse than leaving the defect whole and legible, because the remaining half stops looking like a defect. The half left unfixed here is the default one.

**And in dark it restyles the primary call to action, unrendered.** It takes the Run label from white to near-black on blue. That may well be fine, but it is a visual decision, this repo's workflow rule requires visual verification for rendering changes, and "the type checker was happy" is not that. It was applied without Storybook ever being opened.

## What the fix probably is

Change the **background**, not the text. `--color-accent-strong` has exactly one consumer that puts text on it, so darkening it in the dark palette until white clears 4.5:1 is a contained change — nothing else re-renders. `#1d4ed8` gives white 6.70:1; `#2563eb` gives 5.17:1. The light palette's `#0284c7` needs the same treatment (`#0369a1` gives white 5.93:1).

The alternative, if the near-black label turns out to be wanted, is an explicit `--text-on-accent-strong` token defined per palette — honest about being a second pairing, rather than borrowing the first one's value.

Either way this is a palette decision with a visual check attached, not a line in a PR that was already twelve review rounds deep on an unrelated feature.

## The implementation path is known; the decision is not

Codex raised this independently in a later review round, with numbers matching the measurements above exactly (4.10:1 light, 3.68:1 dark). Two reviewers agreeing does not change the engineering question, but it does settle that the defect is real rather than a matter of taste, so what follows is the mechanics — so that whoever takes the decision does not have to rediscover them.

A per-theme fix needs no palette plumbing. `RunPanel.tsx` already puts a `dark` class on the panel container alongside the inline palette variables, so `RunPanel.css` can scope a rule to `.mthds-run-panel.dark .mthds-run-panel-run` and give each palette its own accessible background. That file currently has no theme-scoped rule at all, so this would be the first.

**What still makes it a decision rather than a fix:** any accessible value hard-codes a colour where `var(--color-accent-strong)` stands today, which severs the Run button from the token a host overrides to theme it. That trade — brand/theming control against AA compliance on the primary call to action — belongs to whoever owns the palette, not to a review round. The measured candidates above are what that decision would choose between.
