# A designed page: the generative entry

A method's form or its result can be shown as a **designed page**: a layout a model wrote once for the method, rendered over the form kernel's own controls, with the kernel's plain form as the fallback whenever the layout cannot be trusted. The layer that renders it, and the method that designs it, both belong to the form kernel `@pipelex/mthds-form`. This package carries them to a host under two names:

| Import path                                  | What it is                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@pipelex/mthds-ui/form/generative`          | The kernel's `./generative` entry, re-exported wholesale: the page, the checks, and the designer's inputs    |
| `@pipelex/mthds-ui/form/layout-design.mthds` | The designer method, a `.mthds` bundle a producer reads as text and hands to a runner, the kernel's own file |

The layer's whole contract — the layout's wire format, what each check refuses, the fallback rule, the escape hatches, the brief and the catalog as data — is the kernel's, and it is documented once, in the kernel's [`docs/generative-ui.md`](https://github.com/Pipelex/mthds-form/blob/main/docs/generative-ui.md). This page says what this package adds to it: where a host imports it from, and what holds about the method file.

## Installing

Nothing beyond this package, as for the rest of the form: the kernel is a dependency of `@pipelex/mthds-ui`, and a host reaches it through this package's entries and never names it ([run-form-panel.md](run-form-panel.md#installing)). That rule matters more here than anywhere. A designed page renders the kernel's controls inside the kernel's React contexts, `FieldStringsProvider` and `FieldPresentationProvider` among them, so a host that imported `@pipelex/mthds-form/generative` directly could end up with a second copy of the kernel, whose page reads none of the providers the host mounted for the plain form.

The entry is re-exported wholesale (`export *`), so it follows the kernel from release to release: whatever the kernel's `./generative` exports at the version this package depends on, this entry exports too, the kernel's own functions rather than copies of them. `src/form/__tests__/generativeEntry.test.ts` pins that, and runs one layout through the checks to show the entry is wired to code that works.

## Rendering a stored layout

A host compiles the stored JSONL, runs the checks, and renders the page only when all of them pass, falling back to the plain form otherwise:

```tsx
"use client";

import {
  GenerativePage,
  PROMPT_HASH,
  layoutFits,
  specFromJsonl,
  validateAgainstCatalog,
} from "@pipelex/mthds-ui/form/generative";

function MethodPage({ stored, fields, store, brand, onRun, plainForm }) {
  // `specFromJsonl` never throws: a line it cannot apply is dropped, and what
  // survives is a partial spec the two checks then refuse.
  const spec = stored ? specFromJsonl(stored.jsonl) : null;
  const renderable =
    spec !== null &&
    stored.promptHash === PROMPT_HASH &&
    validateAgainstCatalog(spec).ok &&
    layoutFits({ inputs: fields }, spec);

  if (!renderable) return plainForm; // the kernel's plain form, which always works
  return (
    <GenerativePage spec={spec} store={store} scope={{ inputs: fields }} brand={brand} onRun={onRun} />
  );
}
```

`fields` is the descriptor the host already derives for the plain form, through `@pipelex/mthds-ui/form`, and `plainForm` is that form, such as a `RunPanel` from `@pipelex/mthds-ui/form/react`. `store` is the json-render state store the host owns, seeded with `seedInputs(fields)` and read back to start the run. The kernel's document, under "Rendering a page", says what the store, the scope and the brand each carry. A render error is the fallback's last case, and a host catches it with an error boundary of its own around the page.

**The entry is a client module**, as the kernel's is: its first line is `"use client"`, and `make smoke-pack` holds the built file to it. In a host that runs React Server Components, the server's module graph therefore sees every export as a client reference, the plain functions included, so `designerCatalog`, `inputBrief`, `specFromJsonl` and the two checks run in client code, or in a plain Node process such as a script or a worker, where the directive means nothing. They do not run in a server component or a server action.

## The designer method

The method that produces a layout is the kernel's `layout-design.mthds`: a bundle whose main pipe, `design_layout`, takes the catalog and the brief as data and an optional seed. A producer reads it as text and hands it to a runner with the two inputs the entry builds:

```ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  DESIGNER_BRIEF_CONCEPT,
  DESIGNER_CATALOG_CONCEPT,
  designerCatalog,
  inputBrief,
} from "@pipelex/mthds-ui/form/generative";

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

A host resolves the file through this package, from its own code, exactly as the kernel's document resolves it through the kernel. It works under every install layout, pnpm's included, where the kernel is linked beside this package and a host's own code cannot resolve `@pipelex/mthds-form` at all.

### The file is a copy, and what keeps it the kernel's

An export map cannot point into a dependency, so the file this package exports is a copy: the build copies the kernel's `layout-design.mthds` into `dist/form/` from the kernel it resolves, which `package-lock.json` pins. The copy has to be the kernel's file exactly, because the two halves of a produced layout come from different places. The method a host sends comes from this package, while the `PROMPT_HASH` the host stamps the layout with, and later compares against, comes from the kernel the host installed. The kernel's pin names its own file, so a copy that differed from it would stamp every layout produced from it with a hash that names another method, and the stale-prompt check would never fire for them.

Two things keep the two in step:

- **`make smoke-pack` compares them, byte for byte**, in a consumer that installed the packed tarball: the file resolved through `@pipelex/mthds-ui/form/layout-design.mthds` from the consumer's root against the kernel's own `layout-design.mthds` resolved from this package. It is the release's own gate, so a release whose copy drifted from the kernel a consumer installs does not ship.
- **The kernel ships a changed method in a minor release, never in a patch.** A changed method moves `PROMPT_HASH` and stales every stored layout at once, a change a host observes in what it stores and compares, and the kernel's release rule keeps such a change out of a patch. A caret range below 1.0 does not bridge a minor, so a kernel with a new method reaches a host only through a release of this package that moves the kernel's range, and that release's build copies the new file.

## Styling

Nothing to add. A designed page renders the kernel's controls and the kernel's own page components, and both styling lanes already cover them: `@pipelex/mthds-ui/tailwind.css` points a Tailwind 4 host's scan at the kernel's whole `dist`, and `@pipelex/mthds-ui/form-kernel.css` is the kernel's prebuilt sheet, which the kernel compiles from both of its rendering entries. See [run-form-panel.md](run-form-panel.md#styling-and-the-trap-in-it).

## What `make smoke-pack` checks

From a consumer that declared only this package and React:

- `@pipelex/mthds-ui/form/generative` and `@pipelex/mthds-ui/form/layout-design.mthds` resolve through the export map, each to a file that ships;
- the entry's built file starts with `"use client"`;
- the entry imports the kernel's `./generative` entry, bare, and nothing else, which also rules out a bundled copy of the kernel;
- it loads in plain Node and builds the designer's catalog, so the re-export reaches working code from a consumer that never named the kernel;
- the method file is the kernel's own, byte for byte, in the kernel the consumer installed.
