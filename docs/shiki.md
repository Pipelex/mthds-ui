# Shiki module — MTHDS syntax highlighting

`src/shiki/` ships the MTHDS TextMate grammar (`mthds.tmLanguage.json`) plus the two Pipelex themes, consumed by the webapp's Monaco editor, the playroom highlight API, and anyone calling `highlightMthds()`.

## Themes

Exactly two themes, both hand-authored here (no stock shiki themes are bundled):

- `pipelex-dark` (`pipelexDarkTheme.ts`) — editor chrome and generic tokens use VS Code Dark+ values; MTHDS-specific scopes use the brand palette (coral pipes, teal concepts, pale-green variables, magenta sigils/Jinja, orange model refs).
- `pipelex-light` (`pipelexLightTheme.ts`) — scope-for-scope mirror of the dark theme. Generic tokens use VS Code Light+ values; brand accents are darkened for contrast on white. A test asserts the two themes cover identical scopes, so adding a scope to one without the other fails CI.

## API (`@pipelex/mthds-ui/shiki`)

- `highlightMthds(code, theme?)` — code → shiki HTML, defaults to `pipelex-dark`.
- `getMthdsTheme(name?)` / `getMthdsThemes()` — raw theme registrations; `getMthdsThemes()` returns both for editors that register every theme up front (e.g. Monaco via `shikiToMonaco`).
- `getMthdsGrammar()`, `getAvailableThemes()`, `MthdsThemeName` (`"pipelex-dark" | "pipelex-light"`).

## Visual testing

Storybook stories live in `src/shiki/__stories__/ShikiThemes.stories.tsx` (`Shiki/Themes`): each theme alone plus a side-by-side comparison over a sample exercising every themed scope. Run `npm run storybook` to eyeball palette changes before publishing.
