# StuffViewer Component — Architecture Plan

## Context

The pipelex Python backend already renders stuff content as HTML using vanilla JS + Jinja2 templates (standalone HTML pages with 3-tab viewer: HTML/JSON/Pretty, plus copy/download/open-external actions). This logic lives in `pipelex/graph/reactflow/templates/_scripts.js.jinja2` and `pipelex/core/stuffs/stuff_viewer.py` + `stuff_viewer.html.jinja2`.

Consumer projects (playroom, vscode-pipelex) import `GraphViewer` from mthds-ui but have **no stuff content inspection capability** today.

Goal: port the stuff viewer into mthds-ui as a reusable React component so that any project using mthds-ui can display stuff content with the same feature set.

## What exists today in mthds-ui

- `GraphViewer` component (full pipeline graph rendering)
- Building blocks: PipeCardNode, ControllerGroupNode, layout engine
- `GraphSpecNodeIoItem` type — currently missing `data`, `data_html`, `data_text` fields
- No stuff content viewer component

## New files in mthds-ui

```
src/graph/react/
  stuff/                          # NEW module
    StuffViewer.tsx               # Main component — the 3-tab viewer
    StuffViewerTypes.ts           # StuffViewerData interface
    stuffViewerUtils.ts           # Pure helpers (extractUrl, contentType checks)
    StuffViewer.css               # Styles (dark theme, tab bar, content areas)
    index.ts                      # Barrel export
  __stories__/
    StuffViewer.stories.tsx       # Storybook stories with various content types
```

## StuffViewer component

### Props

```ts
interface StuffViewerData {
  data?: unknown; // The raw JSON-serializable content
  dataText?: string; // Pretty-printed text representation
  dataHtml?: string; // Pre-rendered HTML
  contentType?: string; // MIME type: "application/pdf", "image/png", etc.
  name?: string; // Display name
  concept?: string; // Concept label
}

interface StuffViewerProps {
  stuff: StuffViewerData;
  onClose?: () => void; // For panel/modal dismiss
  className?: string; // Allows consumer to control sizing/positioning
}
```

### Features (ported from existing JS)

- Tab bar with 3 tabs: HTML (or "PDF"/"Image" based on contentType) / JSON / Pretty
- HTML tab: sanitizes `dataHtml` with DOMPurify, or renders `<embed>` for PDF, `<img>` for images
- JSON tab: `<pre>` with `JSON.stringify(data, null, 2)`
- Pretty tab: `<pre>` with `dataText`
- Action buttons: copy to clipboard, download (smart: downloads the actual image/PDF file when applicable, otherwise the current tab's text content), open external URL

## Responsibility split

| Concern                                              | Owner                                                | Why                                                                                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **StuffViewer component** (tabs, rendering, actions) | mthds-ui                                             | Shared behavior across all consumers                                                                                                                                                         |
| **When/where** to show the viewer                    | Consumer project                                     | Playroom: side panel. VS Code: webview panel. Another app: modal. mthds-ui provides the component, not the container.                                                                        |
| **How** to get the stuff data                        | Consumer project                                     | The GraphSpec already carries `data`, `data_html`, `data_text` on IOSpec items. The consumer extracts the right one (e.g. when user clicks a stuff node) and passes it as `StuffViewerData`. |
| **Node click handling**                              | Consumer project, via callback prop on `GraphViewer` | e.g. `onStuffNodeClick?: (stuffData: StuffViewerData) => void`. The consumer decides what to do (open a panel, show a modal, etc.).                                                          |
| **Layout/positioning**                               | Consumer project                                     | Side panel, inspector drawer, modal — that's app-level UI. `StuffViewer` just fills whatever container it's given.                                                                           |

## Data flow

```
GraphSpec JSON (from pipelex backend)
  |
  |  Already contains per-IOSpec: data, data_text, data_html, content_type
  |
  +-> GraphViewer (existing) -- renders the graph
  |     '- onStuffNodeClick callback -> gives consumer the StuffViewerData
  |
  '-> StuffViewer (new) -- renders the content inspection panel
        +- Tab: HTML/PDF/Image  (dataHtml, or embed/img based on contentType)
        +- Tab: JSON            (data)
        '- Tab: Pretty          (dataText)
```

## Consumer usage example (playroom / Next.js)

```tsx
import { GraphViewer } from "@pipelex/mthds-ui/graph/react";
import { StuffViewer } from "@pipelex/mthds-ui/graph/react/stuff";

const [selectedStuff, setSelectedStuff] = useState<StuffViewerData | null>(null);

<GraphViewer graphspec={spec} onStuffNodeClick={(stuff) => setSelectedStuff(stuff)} />;
{
  selectedStuff && (
    <aside className="inspector-panel">
      <StuffViewer stuff={selectedStuff} onClose={() => setSelectedStuff(null)} />
    </aside>
  );
}
```

## Changes to existing code

1. **`GraphSpecNodeIoItem`** in `types.ts` — add missing fields: `data`, `data_text`, `data_html` (+ `preview`, `size` for completeness)
2. **`GraphViewer`** — add optional `onStuffNodeClick` callback prop, wire it to stuff node click events
3. **`graphBuilders.ts`** — when building stuff nodes, carry the IO data through so it's available at click time (currently only `name`/`concept` are kept)

## Storybook stories

Stories for `StuffViewer` covering:

- Plain text content (markdown string)
- Structured content (JSON object with nested fields)
- HTML content (pre-rendered table/rich text)
- Image content (URL-based)
- PDF content (URL-based embed)
- Edge cases: missing `dataHtml`, missing `dataText`, empty data
