# StuffViewer

`StuffViewer` (`src/graph/react/stuff/StuffViewer.tsx`) renders a single stuff (a data item produced or consumed by a pipe) with three tabs — **HTML** (a preview, labelled `PDF`/`Image` when the content is a document or image), **JSON** (the raw serialized data), and **Pretty** (`data_text`). It is exported standalone and used both inside `GraphViewer` and on its own (docs pages, embedded previews).

## How the HTML tab picks a renderer

The HTML tab resolves content in priority order:

1. **PDF** — when the effective MIME type is `application/pdf`, via `<embed>` (or a clickable open-externally tile when the host can't embed PDFs, e.g. VS Code webviews).
2. **Image** — when the effective MIME type is `image/*`, via `<img>`.
3. **Native `Html` concept** — when `stuff.data` is (or wraps) an MTHDS `Html` concept, rendered in a real sandboxed `<iframe>`. See below.
4. **`data_html`** — a backend-provided rich HTML representation (e.g. a `<table>` summary of a structured concept), sanitized with DOMPurify and rendered inline in a `<div>`.
5. **JSON fallback** — the serialized data in a `<pre>`.

## Native `Html` concept → sandboxed iframe

The MTHDS `Html` native concept (and anything refining it, e.g. a `ClientQuoteHtml`) carries a complete document — `<!doctype html>`, `<style>`, layout and all — in an `inner_html` string field (paired with `css_class`). Rendering such a document inline with `dangerouslySetInnerHTML` is wrong on two counts: DOMPurify strips the doctype/`<head>`/`<style>`, and any surviving styles would leak into the host page.

Instead, when `extractInnerHtml(stuff.data)` (`stuffViewerUtils.ts`) finds an `inner_html`, the HTML tab renders it in a fully sandboxed iframe:

```tsx
<iframe
  className="stuff-viewer-html-frame"
  sandbox=""                                   // no scripts, no same-origin, no forms, no navigation
  srcDoc={DOMPurify.sanitize(innerHtml, { WHOLE_DOCUMENT: true })}
/>
```

`sandbox=""` is the security boundary — it blocks scripts, same-origin access, form submission and navigation. The whole-document DOMPurify pass is defense in depth (it strips `<script>` while preserving `<html>`/`<head>`/`<style>`), so the document's own CSS applies faithfully and stays isolated from the host.

### Direct vs. wrapped concepts

`extractInnerHtml` finds the `inner_html` in either shape:

- **Direct** — the stuff *is* an `Html` concept: `{ inner_html, css_class }`.
- **Wrapped** — the stuff is a structured concept holding an `Html` field: `{ title, date, html_repr: { inner_html, css_class } }`. The helper scans one level deep into object-valued fields and renders the first non-empty `inner_html` it finds.

Whitespace-only `inner_html` is treated as absent, so the viewer falls through to the `data_html`/JSON paths rather than rendering a blank iframe.

Copy and Download on the HTML tab prefer this `inner_html` when present, so the user gets the real document rather than a flattened representation.

Stories: `Graph/StuffViewer` → `NativeHtmlConcept` and `WrappedHtmlConcept`.
