import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { StuffViewer } from "../StuffViewer";
import type { StuffViewerData } from "../stuffViewerTypes";

const meta: Meta<typeof StuffViewer> = {
  title: "Graph/StuffViewer",
  component: StuffViewer,
  decorators: [
    (Story) => (
      <div
        style={{
          width: 600,
          height: 500,
          background: "#0a0a0a",
          border: "1px solid #2a3a5a",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StuffViewer>;

// ─── Fixture data ────────────────────────────────────────────────────────────

const TEXT_STUFF: StuffViewerData = {
  digest: "abc01",
  name: "question",
  concept: "Text",
  data: { text: "What are the key factors for evaluating a candidate's fit?" },
  dataText: "What are the key factors for evaluating a candidate's fit?\n",
  dataHtml: "What are the key factors for evaluating a candidate's fit?",
};

const STRUCTURED_STUFF: StuffViewerData = {
  digest: "xyz99",
  name: "match_analysis",
  concept: "CandidateMatch",
  data: {
    match_score: 5.0,
    strengths:
      "1. **Leadership & Team Management**: Founded and operated his own business with 4 employees.\n\n2. **Customer Service**: 4.9/5 Google Reviews rating with 200+ satisfied customers.",
    gaps: "1. **No B2B Enterprise Sales Experience**: Zero experience in B2B software sales.\n\n2. **No VP-Level Leadership**: No corporate leadership experience at any level.",
    overall_assessment:
      "This candidate is a fundamentally mismatched fit for the VP of Enterprise Sales position. Match score: 5/100.",
  },
  dataText:
    "┏━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ Field                  ┃ Value                                                   ┃\n┡━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩\n│ match_score            │ 5.0                                                     │\n│ overall_assessment     │ Fundamentally mismatched fit. Score: 5/100.             │\n└────────────────────────┴─────────────────────────────────────────────────────────┘\n",
  dataHtml:
    "<table><tr><th>Field</th><th>Value</th></tr><tr><td>match_score</td><td>5.0</td></tr><tr><td>strengths</td><td>Leadership &amp; Team Management, Customer Service</td></tr><tr><td>gaps</td><td>No B2B Enterprise Sales, No VP-Level Leadership</td></tr><tr><td>overall_assessment</td><td>Fundamentally mismatched fit. Score: 5/100.</td></tr></table>",
};

const PDF_STUFF: StuffViewerData = {
  digest: "XHcTw",
  name: "job_offer_pdf",
  concept: "Document",
  contentType: "application/pdf",
  data: {
    url: "pipelex-storage://normalized/abc.pdf",
    public_url: "https://pipelex-web.s3.amazonaws.com/demo/John-Doe-CV.pdf",
    mime_type: "application/pdf",
    filename: "job_offer.pdf",
  },
  dataText: "https://pipelex-web.s3.amazonaws.com/demo/John-Doe-CV.pdf\n",
  dataHtml: '<a href="https://pipelex-web.s3.amazonaws.com/demo/John-Doe-CV.pdf">job_offer.pdf</a>',
};

const IMAGE_STUFF: StuffViewerData = {
  digest: "img01",
  name: "alan_turing",
  concept: "Image",
  contentType: "image/jpeg",
  data: {
    url: "pipelex-storage://images/alan_turing.jpg",
    public_url: "https://pipelex-web.s3.us-west-2.amazonaws.com/tests/alan_turing.jpg",
    mime_type: "image/jpeg",
    filename: "alan_turing.jpg",
  },
  dataText: "https://pipelex-web.s3.us-west-2.amazonaws.com/tests/alan_turing.jpg\n",
  dataHtml:
    '<img src="https://pipelex-web.s3.us-west-2.amazonaws.com/tests/alan_turing.jpg" class="msg-img">',
};

const RICH_HTML_STUFF: StuffViewerData = {
  digest: "html1",
  name: "analysis_report",
  concept: "Report",
  data: { sections: ["summary", "details", "recommendations"] },
  dataText: "Analysis Report\n  summary\n  details\n  recommendations\n",
  dataHtml: `
    <h3>Analysis Report</h3>
    <p>This report covers the following areas:</p>
    <ul>
      <li><strong>Summary</strong>: High-level overview of findings</li>
      <li><strong>Details</strong>: In-depth analysis with <a href="https://example.com">supporting links</a></li>
      <li><strong>Recommendations</strong>: Next steps and action items</li>
    </ul>
    <p><em>Generated automatically by the analysis pipeline.</em></p>
  `,
};

const NO_HTML_STUFF: StuffViewerData = {
  digest: "nohtm",
  name: "raw_data",
  concept: "Config",
  data: { key: "value", nested: { a: 1, b: 2 } },
  dataText: '{\n    "key": "value",\n    "nested": {\n        "a": 1,\n        "b": 2\n    }\n}\n',
};

const PAGE_LIST_STUFF: StuffViewerData = {
  digest: "cz4Gg",
  name: "cv_pages",
  concept: "Page",
  data: {
    items: [
      {
        text_and_images: { text: { text: "DRY RUN: OCR text" }, images: [], raw_html: null },
        page_view: null,
      },
      {
        text_and_images: { text: { text: "DRY RUN: OCR text" }, images: [], raw_html: null },
        page_view: null,
      },
      {
        text_and_images: { text: { text: "DRY RUN: OCR text" }, images: [], raw_html: null },
        page_view: null,
      },
      {
        text_and_images: { text: { text: "DRY RUN: OCR text" }, images: [], raw_html: null },
        page_view: null,
      },
    ],
  },
  dataText:
    "   1    \u2502 DRY RUN: OCR text\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   2    \u2502 DRY RUN: OCR text\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   3    \u2502 DRY RUN: OCR text\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   4    \u2502 DRY RUN: OCR text\n",
  dataHtml:
    "<ul><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li></ul>",
};

const LOCAL_IMAGE_STUFF: StuffViewerData = {
  digest: "li001",
  name: "eiffel_tower",
  concept: "Image",
  contentType: "image/jpeg",
  data: {
    url: "pipelex-storage://normalized/eiffel_tower.jpg",
    public_url: "/fixtures/eiffel_tower.jpg",
    mime_type: "image/jpeg",
    filename: "eiffel_tower.jpg",
  },
  dataText: "/fixtures/eiffel_tower.jpg\n",
  dataHtml: '<img src="/fixtures/eiffel_tower.jpg" class="msg-img">',
};

const LOCAL_PDF_STUFF: StuffViewerData = {
  digest: "lp001",
  name: "job_offer",
  concept: "Document",
  contentType: "application/pdf",
  data: {
    url: "pipelex-storage://normalized/Job-Offer.pdf",
    public_url: "/fixtures/Job-Offer.pdf",
    mime_type: "application/pdf",
    filename: "Job-Offer.pdf",
  },
  dataText: "/fixtures/Job-Offer.pdf\n",
  dataHtml: '<a href="/fixtures/Job-Offer.pdf">Job-Offer.pdf</a>',
};

const INTERNAL_STORAGE_IMAGE_STUFF: StuffViewerData = {
  digest: "is001",
  name: "thumbnail",
  concept: "Image",
  contentType: "image/png",
  data: {
    url: "pipelex-storage://anonymous/85bc58dc26cda5ab.png",
    public_url: "pipelex-storage://anonymous/85bc58dc26cda5ab.png",
    mime_type: "image/png",
    filename: null,
  },
  dataText: "pipelex-storage://anonymous/85bc58dc26cda5ab.png\n",
  dataHtml: '<img src="pipelex-storage://anonymous/85bc58dc26cda5ab.png" class="msg-img">',
};

// A full rendered devis, exactly as an MTHDS `Html`-refining concept carries it:
// the whole document lives in `inner_html`, styles included. The StuffViewer must
// render this in a real sandboxed iframe so the <style> block applies faithfully
// instead of being flattened / stripped.
const DEVIS_INNER_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Devis LATL-2087</title>
<style>
  :root{--ink:#1a1a1a;--muted:#6b6b6b;--line:#dcdcdc;--bg:#fff;--gold:#b8912f;--accent:#111;}
  *{box-sizing:border-box}
  body{margin:0;background:#f2f2f2;color:var(--ink);font:14px/1.55 "Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  .sheet{max-width:820px;margin:24px auto;background:var(--bg);padding:44px 52px 60px;box-shadow:0 1px 6px rgba(0,0,0,.12);}
  header.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--accent);padding-bottom:18px;}
  .maison .name{font-size:22px;letter-spacing:.28em;font-weight:600;text-transform:uppercase;}
  .maison .tagline{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:4px;}
  .maison .addr{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5;}
  .cobrand{text-align:right;font-size:12px;color:var(--muted);}
  .cobrand .brand{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);font-weight:600;}
  .devis-band{display:flex;justify-content:space-between;align-items:flex-start;margin:22px 0 8px;gap:20px;}
  .devis-band .num{font-size:16px;font-weight:700;letter-spacing:.04em;border:1px solid var(--accent);padding:6px 12px;white-space:nowrap;}
  .refs{font-size:11.5px;color:var(--muted);text-align:right;line-height:1.7;}
  .refs b{color:var(--ink);font-weight:600;}
  h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:5px;margin:26px 0 12px;}
  .watch{display:grid;grid-template-columns:1fr 1fr;gap:2px 26px;font-size:12.5px;}
  .watch div span{color:var(--muted);display:inline-block;min-width:104px;}
  ul.diag{margin:0;padding-left:18px;font-size:13px;}
  ul.diag li{margin:3px 0;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--accent);padding:6px 4px;}
  th.num,td.num{text-align:right;white-space:nowrap;}
  td{padding:8px 4px;border-bottom:1px solid var(--line);vertical-align:top;}
  td .ops{margin:5px 0 0;padding-left:16px;color:var(--muted);font-size:11.5px;}
  .qty{color:var(--muted);font-size:12px;}
  .totals{margin-top:14px;margin-left:auto;width:290px;font-size:13px;}
  .totals div{display:flex;justify-content:space-between;padding:4px 0;}
  .totals .grand{border-top:2px solid var(--accent);margin-top:4px;padding-top:8px;font-weight:700;font-size:15px;}
  .delay{margin-top:22px;font-size:12.5px;font-weight:600;}
  .terms{margin-top:26px;font-size:11px;color:#444;}
  .terms .block{margin-top:12px;}
  .terms .block .lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;font-weight:600;}
</style>
</head>
<body>
<div class="sheet">
  <header class="top">
    <div class="maison">
      <div class="name">Les Ateliers</div>
      <div class="tagline">Atelier horloger — Genève</div>
      <div class="addr">12 Rue du Rhône<br/>1204 Genève</div>
    </div>
    <div class="cobrand">Service agréé<div class="brand">TAG Heuer</div></div>
  </header>
  <div class="devis-band">
    <div class="num">DEVIS N° LATL-2087</div>
    <div class="refs">Le <b>06/07/2026</b><br/>Valable jusqu'au <b>06/09/2026</b><br/>Votre référence : <b>Carnet-2087 / M. Dubois</b><br/>Référence dossier : <b>TAG-DV-55913</b></div>
  </div>
  <div style="font-size:12.5px;margin-bottom:4px">Concernant la montre de <b>M. Dubois</b></div>
  <h2>Votre garde-temps</h2>
  <div class="watch">
    <div><span>Marque</span>TAG Heuer</div>
    <div><span>Collection</span>Carrera</div>
    <div><span>Modèle</span>Chronographe</div>
    <div><span>Référence</span>CBN2A1B</div>
    <div><span>N° de série</span>RPX8842</div>
    <div><span>Calibre</span>Heuer 02</div>
  </div>
  <h2>Diagnostic de notre atelier</h2>
  <ul class="diag"><li>Réserve de marche insuffisante, oscillations irrégulières.</li><li>Étanchéité à contrôler, joints à remplacer.</li></ul>
  <h2>Interventions nécessaires</h2>
  <table>
    <thead><tr><th>Prestation</th><th class="num">Prix TTC</th></tr></thead>
    <tbody>
      <tr><td>Révision complète du mouvement<ul class="ops"><li>Démontage, nettoyage, remontage</li><li>Lubrification et réglage</li></ul></td><td class="num">690,00&nbsp;€</td></tr>
      <tr><td>Remplacement des joints d'étanchéité</td><td class="num">Inclus</td></tr>
    </tbody>
  </table>
  <div class="totals">
    <div><span>Total H.T.</span><span>575,00&nbsp;€</span></div>
    <div><span>TVA 20 %</span><span>115,00&nbsp;€</span></div>
    <div class="grand"><span>Total TTC</span><span>690,00&nbsp;€</span></div>
  </div>
  <div class="delay">Délai estimé : 6 semaines à réception de votre accord.</div>
  <h2>Conditions</h2>
  <div class="terms">
    <div class="block"><div class="lbl">Garantie du service</div>L'intervention est garantie 24 mois.</div>
    <div class="block"><div class="lbl">Validité de l'offre</div>Ce devis est valable 2 mois à compter de sa date d'émission.</div>
  </div>
</div>
</body>
</html>`;

// Native `Html` concept: stuff.data IS `{ inner_html, css_class }`.
const NATIVE_HTML_STUFF: StuffViewerData = {
  digest: "devis1",
  name: "client_html",
  concept: "ClientQuoteHtml",
  data: { inner_html: DEVIS_INNER_HTML, css_class: "" },
};

// Wrapped concept: a structured concept (title/date) whose `html_repr` field IS a
// native `Html` concept. The iframe must still find and render the nested inner_html.
const WRAPPED_HTML_STUFF: StuffViewerData = {
  digest: "wrap01",
  name: "quote_document",
  concept: "QuoteDocument",
  data: {
    title: "Devis de révision — Carrera",
    date: "2026-07-06",
    html_repr: { inner_html: DEVIS_INNER_HTML, css_class: "quote-sheet" },
  },
};

const EMPTY_STUFF: StuffViewerData = {
  digest: "empty",
};

// ─── Stories ─────────────────────────────────────────────────────────────────

export const TextContent: Story = {
  args: { stuff: TEXT_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("question")).toBeInTheDocument();
    await expect(canvas.getByText("Text")).toBeInTheDocument();
  },
};

export const StructuredContent: Story = {
  args: { stuff: STRUCTURED_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("match_analysis")).toBeInTheDocument();
    await expect(canvas.getByText("CandidateMatch")).toBeInTheDocument();
  },
};

export const PDFContent: Story = {
  args: { stuff: PDF_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("job_offer_pdf")).toBeInTheDocument();
    await expect(canvas.getByText("PDF")).toBeInTheDocument();
  },
};

/** Simulates an embed-incapable host (e.g. VS Code webview): no <embed>, just
 *  a clickable tile that calls `onOpenExternally`. */
export const PDFContentEmbedDisabled: Story = {
  args: {
    stuff: PDF_STUFF,
    canEmbedPdf: false,
    onOpenExternally: (url, filename) => {
      // eslint-disable-next-line no-console
      console.log("onOpenExternally", { url, filename });
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("job_offer.pdf")).toBeInTheDocument();
    await expect(canvas.getByText("Click to open PDF externally")).toBeInTheDocument();
  },
};

export const ImageContent: Story = {
  args: { stuff: IMAGE_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("alan_turing")).toBeInTheDocument();
    // "Image" appears in both subtitle and tab label — verify at least one exists
    const imageElements = canvas.getAllByText("Image");
    await expect(imageElements.length).toBeGreaterThanOrEqual(1);
  },
};

export const HTMLRichContent: Story = {
  args: { stuff: RICH_HTML_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("analysis_report")).toBeInTheDocument();
  },
};

export const MissingHtml: Story = {
  args: { stuff: NO_HTML_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("raw_data")).toBeInTheDocument();
    // HTML tab should fall back to JSON display
    await expect(canvas.getByText("HTML")).toBeInTheDocument();
  },
};

export const PageList: Story = {
  args: { stuff: PAGE_LIST_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("cv_pages")).toBeInTheDocument();
    await expect(canvas.getByText("Page")).toBeInTheDocument();
  },
};

export const LocalImage: Story = {
  args: { stuff: LOCAL_IMAGE_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("eiffel_tower")).toBeInTheDocument();
  },
};

export const LocalPDF: Story = {
  args: { stuff: LOCAL_PDF_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("job_offer")).toBeInTheDocument();
    await expect(canvas.getByText("PDF")).toBeInTheDocument();
  },
};

export const InternalStorageImage: Story = {
  args: { stuff: INTERNAL_STORAGE_IMAGE_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // "thumbnail" appears in both the header title and the local file card
    const thumbnailElements = canvas.getAllByText("thumbnail");
    await expect(thumbnailElements.length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByText(/no preview available/)).toBeInTheDocument();
  },
};

/** Native `Html` concept — the whole devis document lives in `inner_html` and
 *  must render inside a real sandboxed iframe (its own <style> applies). */
export const NativeHtmlConcept: Story = {
  args: { stuff: NATIVE_HTML_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("client_html")).toBeInTheDocument();
    await expect(canvas.getByText("ClientQuoteHtml")).toBeInTheDocument();
    // The document renders in an iframe, not inlined into the host DOM.
    const frame = canvasElement.querySelector("iframe.stuff-viewer-html-frame");
    await expect(frame).not.toBeNull();
    await expect(frame).toHaveAttribute("sandbox", "");
    // The devis markup is inside the iframe's srcDoc, not the host document.
    await expect(frame?.getAttribute("srcdoc") ?? "").toContain("DEVIS N° LATL-2087");
    await expect(canvas.queryByText("DEVIS N° LATL-2087")).toBeNull();
  },
};

/** Wrapped concept — a structured concept (title/date) whose `html_repr` field
 *  is itself an `Html` concept. The iframe must still find the nested inner_html. */
export const WrappedHtmlConcept: Story = {
  args: { stuff: WRAPPED_HTML_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("quote_document")).toBeInTheDocument();
    const frame = canvasElement.querySelector("iframe.stuff-viewer-html-frame");
    await expect(frame).not.toBeNull();
    await expect(frame?.getAttribute("srcdoc") ?? "").toContain("DEVIS N° LATL-2087");
  },
};

export const EmptyData: Story = {
  args: { stuff: EMPTY_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("(unnamed stuff)")).toBeInTheDocument();
  },
};
