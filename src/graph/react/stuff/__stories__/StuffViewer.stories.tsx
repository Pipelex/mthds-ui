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
    public_url: "https://example.com/sample.pdf",
    mime_type: "application/pdf",
    filename: "job_offer.pdf",
  },
  dataText: "https://example.com/sample.pdf\n",
  dataHtml: '<a href="https://example.com/sample.pdf">job_offer.pdf</a>',
};

const IMAGE_STUFF: StuffViewerData = {
  digest: "img01",
  name: "generated_image",
  concept: "Image",
  contentType: "image/png",
  data: {
    url: "pipelex-storage://images/photo.png",
    public_url: "https://picsum.photos/400/300",
  },
  dataText: "https://picsum.photos/400/300\n",
  dataHtml: '<img src="https://picsum.photos/400/300" class="msg-img">',
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

export const ImageContent: Story = {
  args: { stuff: IMAGE_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("generated_image")).toBeInTheDocument();
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

export const EmptyData: Story = {
  args: { stuff: EMPTY_STUFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Data")).toBeInTheDocument();
  },
};
