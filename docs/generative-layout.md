# A designed page: the generative entry

A method's form or its result can be shown as a **designed page**: a layout a model wrote once for the method, rendered over the form kernel's own controls, with the kernel's plain form as the fallback whenever the layout cannot be trusted. The layer that renders it, and the method that designs it, both belong to the form kernel `@pipelex/mthds-form`. This package carries them to a host under three names:

| Import path                                  | What it is                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pipelex/mthds-ui/form/generative`          | The kernel's `./generative` entry, re-exported wholesale: the page, the brand's bar, the checks, and the designer's inputs. A client module    |
| `@pipelex/mthds-ui/form/generative/headless` | The kernel's `./generative/headless` entry, re-exported wholesale: the designer's inputs and the checks, with no React and no client directive |
| `@pipelex/mthds-ui/form/layout-design.mthds` | The designer method, a `.mthds` bundle a producer reads as text and hands to a runner, the kernel's own file                                   |

The layer's whole contract — the layout's wire format, what each check refuses, the fallback rule, the escape hatches, the brief and the catalog as data — is the kernel's, and it is documented once, in the kernel's [`docs/generative-ui.md`](https://github.com/Pipelex/mthds-form/blob/main/docs/generative-ui.md). This page says what this package adds to it: where a host imports each half from, and what holds about the method file.

## Installing

Nothing beyond this package, as for the rest of the form: the kernel is a dependency of `@pipelex/mthds-ui`, and a host reaches it through this package's entries and never names it ([run-form-panel.md](run-form-panel.md#installing)). That rule matters more here than anywhere. A designed page renders the kernel's controls inside the kernel's React contexts, `FieldStringsProvider` and `FieldPresentationProvider` among them, so a host that imported `@pipelex/mthds-form/generative` directly could end up with a second copy of the kernel, whose page reads none of the providers the host mounted for the plain form.

Both entries are re-exported wholesale (`export *`), so they follow the kernel from release to release: whatever the kernel's `./generative` and `./generative/headless` export at the version this package depends on, these entries export too, the kernel's own functions rather than copies of them. `src/form/__tests__/generativeEntry.test.ts` and `src/form/__tests__/generativeHeadlessEntry.test.ts` pin that, and each runs a layout through the checks to show its entry is wired to code that works.

## Which entry, where

The two entries are one layer split by where its code may run. **`./form/generative/headless` renders nothing**: the designer's catalog and the frames' vocabularies (`designerCatalog`, `frameCatalog`, `FRAMES`), the brief (`inputBrief`, `resultBrief`), the concepts the designer's inputs travel under, the prompt pin (`PROMPT_HASH`, `promptHashSubject`), `seedLine`, the JSONL compiler (`specFromJsonl`, `specToJsonl`), the checks (`validateAgainstCatalog`, `layoutFits`, `layoutProblems`, `layoutCheckProblems`, `REPAIR_ATTEMPTS`), the state paths and `payloadToState`. It has no React and no `"use client"` directive. **`./form/generative` is all of that, plus what renders**: `GenerativePage`, `BrandBar`, `BrandProvider`, `FrameHostProvider`, `createStateStore` and the rest of the page's React surface. Its first line is `"use client"`.

The directive is why the split exists. In a host running React Server Components, the server's module graph sees every export of a client module as a client reference, the plain functions included, and calling one there throws. So:

| Where the code runs                                                  | Import from                                  |
| -------------------------------------------------------------------- | -------------------------------------------- |
| A server component or a server action: producing, checking, stamping | `@pipelex/mthds-ui/form/generative/headless` |
| A client component: rendering a page, drawing the brand's bar        | `@pipelex/mthds-ui/form/generative`          |
| A script or a worker with no React Server Components                 | either; the headless entry needs no React    |

Nothing a client imports moved when the headless entry was added: `./form/generative` still carries every function the headless entry does, the same functions, so a client component that checks a layout before rendering it keeps importing everything from one place. The two entries carry the same `PROMPT_HASH`, so a layout stamped on the server compares equal on the client.

## Rendering a stored layout

A host compiles the stored JSONL, runs the checks, and renders the page only when all of them pass, falling back to the plain form otherwise:

```tsx
"use client";

import { useState } from "react";
import {
  GenerativePage,
  PROMPT_HASH,
  layoutFits,
  specFromJsonl,
  validateAgainstCatalog,
} from "@pipelex/mthds-ui/form/generative";

function MethodPage({ stored, fields, store, brand, onRun, plainForm }) {
  const [broken, setBroken] = useState(false);
  // `specFromJsonl` never throws: a line it cannot apply is dropped, and what
  // survives is a partial spec the two checks then refuse.
  const spec = stored ? specFromJsonl(stored.jsonl) : null;
  const renderable =
    !broken &&
    spec !== null &&
    stored.promptHash === PROMPT_HASH &&
    validateAgainstCatalog(spec).ok &&
    layoutFits({ inputs: fields }, spec);

  if (!renderable) return plainForm; // the kernel's plain form, which always works
  return (
    <GenerativePage
      spec={spec}
      store={store}
      scope={{ inputs: fields }}
      brand={brand}
      onRun={onRun}
      onElementError={() => setBroken(true)}
    />
  );
}
```

`fields` is the descriptor the host already derives for the plain form, through `@pipelex/mthds-ui/form`, and `plainForm` is that form, such as a `RunPanel` from `@pipelex/mthds-ui/form/react`. `store` is the json-render state store the host owns, made with the entry's own `createStateStore`, seeded with `seedInputs(fields)` and read back to start the run. The kernel's document, under "Rendering a page", says what the store, the scope and the brand each carry.

**An element that throws is the fallback's last case**, and the page reports it rather than a boundary around it. Since kernel 0.32.0 a layout the checks accept no longer throws in a renderer, since every renderer is held to the catalog's declaration of its props; for anything left, `GenerativePage` takes `onElementError(error, { type, componentStack })`, called once per element that threw, the root included, after the element has been dropped from the page. A host that would rather show the plain form than a page with a hole in it switches to it there. The handler's two types, `ElementErrorHandler` and `ElementErrorInfo`, come from the same entry.

**The brand's bar is the host's to draw as well.** `BrandBar` draws the logo pair, the app's name, its links and a tag, the bar the catalog's `AppBar` draws on a whole page, for a host to set as its own chrome over the plain form or above a layout in a frame that has no app bar. It reads the brand from a `BrandProvider` above it, which it must be drawn inside.

**The checks refuse more since kernel 0.32.0, and a stored layout may fall back because of it.** `validateAgainstCatalog` accepts the `run` action only directly under a `press` or a `submit` (Enter in a field), and refuses it under `change`, `focus` or `blur`, under a `watch`, and anywhere in an `onSuccess` or `onError` chain, because a run is billed and starts only from a deliberate gesture; `layoutCheckProblems` asks for a `run` under some element's `on.press`. It also refuses a `Picture` whose `path` is an expression, and `layoutFits` refuses a repeat over a path that holds no list and the props that take a list bound to something else. A layout stored before that relied on any of these shapes now fails its checks, so the host renders the plain form until the layout is designed again, as it does for any layout it cannot trust.

## The designer method

The method that produces a layout is the kernel's `layout-design.mthds`: a bundle whose main pipe, `design_layout`, takes the catalog and the brief as data and an optional seed, and whose second pipe, `repair_layout`, takes a refused page with the problems `layoutCheckProblems` found in it and writes the page again. A producer reads it as text and hands it to a runner with the two inputs the headless entry builds, on a server or in a script:

```ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  DESIGNER_BRIEF_CONCEPT,
  DESIGNER_CATALOG_CONCEPT,
  designerCatalog,
  inputBrief,
} from "@pipelex/mthds-ui/form/generative/headless";

const methodFile = createRequire(import.meta.url).resolve(
  "@pipelex/mthds-ui/form/layout-design.mthds",
);
const request = {
  mthds_contents: [readFileSync(methodFile, "utf8")],
  pipe_code: "design_layout",
  inputs: {
    catalog: { concept: DESIGNER_CATALOG_CONCEPT, content: designerCatalog() },
    brief: { concept: DESIGNER_BRIEF_CONCEPT, content: inputBrief({ pipeRef }, fields) },
  },
};
```

A layout for one moment of a host's app rather than a whole page takes the frame and the team's style: `designerCatalog({ frame: "composer" })` and `inputBrief({ pipeRef }, fields, { frame: "composer", style })`, then `layoutCheckProblems(spec, { frame: "composer", descriptor: { inputs: fields } })` on what comes back, which the producer sends to `repair_layout` while it is not empty, at most `REPAIR_ATTEMPTS` times. The kernel's document describes the frames.

A host resolves the file through this package, from its own code, exactly as the kernel's document resolves it through the kernel. It works under every install layout, pnpm's included, where the kernel is linked beside this package and a host's own code cannot resolve `@pipelex/mthds-form` at all. `@pipelex/mthds-ui/form/layout-design.mthds` is a key of this package's `exports`, mapped to the file itself, so `require.resolve` and `import.meta.resolve` both return its path; a bundler that follows such a resolve to decide which files a server deploys must be told to keep a file nothing imports, which is the host's configuration rather than this package's.

### The file is a copy, and what keeps it the kernel's

An export map cannot point into a dependency, so the file this package exports is a copy: the build copies the kernel's `layout-design.mthds` into `dist/form/` from the kernel it resolves, which `package-lock.json` pins. The copy has to be the kernel's file exactly, because the two halves of a produced layout come from different places. The method a host sends comes from this package, while the `PROMPT_HASH` the host stamps the layout with, and later compares against, comes from the kernel the host installed. The kernel's pin names its own file, so a copy that differed from it would stamp every layout produced from it with a hash that names another method, and the stale-prompt check would never fire for them.

Two things keep the two in step:

- **`make smoke-pack` compares them, byte for byte**, in a consumer that installed the packed tarball: the file resolved through `@pipelex/mthds-ui/form/layout-design.mthds` from the consumer's root against the kernel's own `layout-design.mthds` resolved from this package. It is the release's own gate, so a release whose copy drifted from the kernel a consumer installs does not ship.
- **The kernel ships a changed method in a minor release, never in a patch.** A changed method moves `PROMPT_HASH` and stales every stored layout at once, a change a host observes in what it stores and compares, and the kernel's release rule keeps such a change out of a patch. A caret range below 1.0 does not bridge a minor, so a kernel with a new method reaches a host only through a release of this package that moves the kernel's range, and that release's build copies the new file.

## Styling

Nothing to add. A designed page renders the kernel's controls and the kernel's own page components, and both styling lanes already cover them: `@pipelex/mthds-ui/tailwind.css` points a Tailwind 4 host's scan at the kernel's whole `dist`, and `@pipelex/mthds-ui/form-kernel.css` is the kernel's prebuilt sheet, which the kernel compiles from both of its rendering entries. See [run-form-panel.md](run-form-panel.md#styling-and-the-trap-in-it).

## What `make smoke-pack` checks

From a consumer that declared only this package and React:

- `@pipelex/mthds-ui/form/generative`, `@pipelex/mthds-ui/form/generative/headless` and `@pipelex/mthds-ui/form/layout-design.mthds` resolve through the export map, each to a file that ships;
- the client entry's built file starts with `"use client"`, and neither the headless entry's built file nor the kernel's `./generative/headless` file it re-exports carries the directive;
- each entry imports its one kernel entry, bare, and nothing else, which also rules out a bundled copy of the kernel;
- the client entry loads in plain Node and builds the designer's catalog, so the re-export reaches working code from a consumer that never named the kernel;
- the headless entry loads under Node's `react-server` condition, the module graph a React Server Components host gives its server, builds the composer's catalog and answers a malformed layout with problems rather than a throw, and its `PROMPT_HASH` is the client entry's;
- the method file is the kernel's own, byte for byte, in the kernel the consumer installed.
