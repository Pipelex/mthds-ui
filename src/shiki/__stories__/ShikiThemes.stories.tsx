import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { highlightMthds } from "../highlighter";
import type { MthdsThemeName } from "../themes";

/** Sample exercising every themed scope: concepts, pipes, structures, strings, numbers, booleans, comments, Jinja, model refs. */
const SAMPLE = `# Invoice extraction — syntax sample
domain      = "invoice_reimbursement"
description = "Extract structured data from invoices"
main_pipe   = "process_invoices"

[concept.LineItem]
description = "A single line item on an invoice"

[concept.LineItem.structure]
description = { type = "text", description = "Item or service", required = true }
quantity    = { type = "number", description = "Quantity of units" }
total       = { type = "number", description = "Total cost" }

[pipe.parse_invoice_data]
type        = "PipeLLM"
description = "Parse structured invoice data"
inputs      = { invoice_pages = "Page" }
output      = "InvoiceData"
model       = "$best-claude"
prompt      = """
Extract every line item from this invoice.
{% if invoice_pages %}Pages: @invoice_pages{% endif %}
"""

[pipe.process_invoices]
type   = "PipeBatch"
inputs = { invoices = "Document" }
output = "InvoiceData[]"
branch_pipe_code = "parse_invoice_data"
combined = true
`;

function HighlightedSample({ theme }: { theme: MthdsThemeName }) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    highlightMthds(SAMPLE, theme).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  if (!html) return <div style={{ padding: 16, fontFamily: "monospace" }}>highlighting…</div>;

  return (
    <div
      style={{ fontSize: 13, lineHeight: 1.6, borderRadius: 8, overflow: "auto" }}
      // Shiki output is generated from our own grammar + themes, not user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const meta = {
  title: "Shiki/Themes",
  component: HighlightedSample,
  parameters: { layout: "padded" },
} satisfies Meta<typeof HighlightedSample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PipelexDark: Story = {
  args: { theme: "pipelex-dark" },
};

export const PipelexLight: Story = {
  args: { theme: "pipelex-light" },
};

export const SideBySide: Story = {
  args: { theme: "pipelex-dark" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <HighlightedSample theme="pipelex-dark" />
      <HighlightedSample theme="pipelex-light" />
    </div>
  ),
};
