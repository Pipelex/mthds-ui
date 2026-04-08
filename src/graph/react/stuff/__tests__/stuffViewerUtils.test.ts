import { describe, it, expect } from "vitest";
import {
  isSafeDisplayUrl,
  isInlineRenderableUrl,
  extractUrl,
  extractInlineUrl,
  extractFilename,
  getHtmlTabLabel,
  findStuffDataByDigest,
} from "../stuffViewerUtils";
import type { GraphSpec } from "@graph/types";

// ─── isSafeDisplayUrl ────────────────────────────────────────────────────────

describe("isSafeDisplayUrl", () => {
  it("accepts https URLs", () => {
    expect(isSafeDisplayUrl("https://example.com/file.pdf")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isSafeDisplayUrl("http://localhost:3000/img.png")).toBe(true);
  });

  it("accepts file:// URIs", () => {
    expect(isSafeDisplayUrl("file:///home/user/doc.pdf")).toBe(true);
  });

  it("accepts relative URLs", () => {
    expect(isSafeDisplayUrl("/fixtures/image.jpg")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeDisplayUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isSafeDisplayUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeDisplayUrl("")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isSafeDisplayUrl(null)).toBe(false);
    expect(isSafeDisplayUrl(undefined)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isSafeDisplayUrl(42)).toBe(false);
    expect(isSafeDisplayUrl({})).toBe(false);
  });
});

// ─── isInlineRenderableUrl ──────────────────────────────────────────────────

describe("isInlineRenderableUrl", () => {
  it("accepts https URLs", () => {
    expect(isInlineRenderableUrl("https://example.com/img.png")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isInlineRenderableUrl("http://localhost:3000/img.png")).toBe(true);
  });

  it("accepts file:// URIs", () => {
    expect(isInlineRenderableUrl("file:///home/user/doc.pdf")).toBe(true);
  });

  it("accepts relative URLs", () => {
    expect(isInlineRenderableUrl("/fixtures/image.jpg")).toBe(true);
  });

  it("rejects pipelex-storage:// URLs", () => {
    expect(isInlineRenderableUrl("pipelex-storage://normalized/abc.pdf")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isInlineRenderableUrl(null)).toBe(false);
    expect(isInlineRenderableUrl(undefined)).toBe(false);
  });
});

// ─── extractInlineUrl ──────────────────────────────────────────────────────

describe("extractInlineUrl", () => {
  it("extracts https public_url", () => {
    expect(
      extractInlineUrl({ public_url: "https://cdn.example.com/img.png", url: "internal://x" }),
    ).toBe("https://cdn.example.com/img.png");
  });

  it("extracts file:// URLs for inline rendering", () => {
    expect(
      extractInlineUrl({
        public_url: "file:///Users/someone/file.jpg",
        url: "pipelex-storage://abc",
      }),
    ).toBe("file:///Users/someone/file.jpg");
  });

  it("returns null for pipelex-storage:// only URLs", () => {
    expect(
      extractInlineUrl({
        public_url: "pipelex-storage://anonymous/img.png",
        url: "pipelex-storage://normalized/img.png",
      }),
    ).toBeNull();
  });

  it("returns null for null/undefined data", () => {
    expect(extractInlineUrl(null)).toBeNull();
    expect(extractInlineUrl(undefined)).toBeNull();
  });
});

// ─── extractFilename ────────────────────────────────────────────────────────

describe("extractFilename", () => {
  it("extracts filename from data object", () => {
    expect(extractFilename({ filename: "report.pdf" })).toBe("report.pdf");
  });

  it("returns null when filename is missing", () => {
    expect(extractFilename({ url: "https://example.com" })).toBeNull();
  });

  it("returns null for null filename", () => {
    expect(extractFilename({ filename: null })).toBeNull();
  });

  it("returns null for non-object data", () => {
    expect(extractFilename(null)).toBeNull();
    expect(extractFilename("string")).toBeNull();
  });
});

// ─── extractUrl ──────────────────────────────────────────────────────────────

describe("extractUrl", () => {
  it("extracts public_url from data object", () => {
    expect(
      extractUrl({ public_url: "https://cdn.example.com/file.pdf", url: "internal://x" }),
    ).toBe("https://cdn.example.com/file.pdf");
  });

  it("falls back to url when public_url is missing", () => {
    expect(extractUrl({ url: "https://example.com/file.pdf" })).toBe(
      "https://example.com/file.pdf",
    );
  });

  it("extracts from src field", () => {
    expect(extractUrl({ src: "https://img.example.com/photo.jpg" })).toBe(
      "https://img.example.com/photo.jpg",
    );
  });

  it("returns null for internal-only URLs", () => {
    expect(extractUrl({ url: "pipelex-storage://normalized/abc.pdf" })).toBeNull();
  });

  it("returns URL when data is a string", () => {
    expect(extractUrl("https://example.com")).toBe("https://example.com");
  });

  it("returns null for unsafe string data", () => {
    expect(extractUrl("javascript:void(0)")).toBeNull();
  });

  it("returns null for null/undefined data", () => {
    expect(extractUrl(null)).toBeNull();
    expect(extractUrl(undefined)).toBeNull();
  });

  it("returns null for non-object data", () => {
    expect(extractUrl(42)).toBeNull();
    expect(extractUrl(true)).toBeNull();
  });

  it("returns null when no URL fields present", () => {
    expect(extractUrl({ text: "hello" })).toBeNull();
  });
});

// ─── getHtmlTabLabel ─────────────────────────────────────────────────────────

describe("getHtmlTabLabel", () => {
  it('returns "PDF" for application/pdf', () => {
    expect(getHtmlTabLabel("application/pdf")).toBe("PDF");
  });

  it('returns "Image" for image/* types', () => {
    expect(getHtmlTabLabel("image/png")).toBe("Image");
    expect(getHtmlTabLabel("image/jpeg")).toBe("Image");
    expect(getHtmlTabLabel("image/svg+xml")).toBe("Image");
  });

  it('returns "HTML" for other types', () => {
    expect(getHtmlTabLabel("text/html")).toBe("HTML");
    expect(getHtmlTabLabel("application/json")).toBe("HTML");
  });

  it('returns "HTML" for undefined', () => {
    expect(getHtmlTabLabel(undefined)).toBe("HTML");
  });
});

// ─── findStuffDataByDigest ───────────────────────────────────────────────────

describe("findStuffDataByDigest", () => {
  const mockSpec: GraphSpec = {
    nodes: [
      {
        id: "node_0",
        pipe_type: "PipeSequence",
        status: "succeeded",
        io: {
          inputs: [
            {
              name: "input_doc",
              digest: "abc12",
              concept: "Document",
              content_type: "application/pdf",
              data: { url: "file:///doc.pdf" },
              data_text: "doc.pdf\n",
              data_html: '<a href="file:///doc.pdf">doc.pdf</a>',
            },
          ],
          outputs: [
            {
              name: "result",
              digest: "xyz99",
              concept: "Text",
              data: { text: "hello world" },
              data_text: "hello world\n",
              data_html: "hello world",
            },
          ],
        },
      },
      {
        id: "node_1",
        pipe_type: "PipeLLM",
        status: "succeeded",
        io: {
          inputs: [{ name: "input_doc", digest: "abc12", concept: "Document" }],
          outputs: [
            {
              name: "result",
              digest: "xyz99",
              concept: "Text",
              data: { text: "output from producer" },
              data_text: "output from producer\n",
              data_html: "output from producer",
            },
          ],
        },
      },
    ],
    edges: [],
  };

  it("finds stuff data from outputs (producer data preferred)", () => {
    const result = findStuffDataByDigest(mockSpec, "xyz99");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("result");
    expect(result!.concept).toBe("Text");
    // Should get the first output match (node_0's output)
    expect(result!.data).toEqual({ text: "hello world" });
  });

  it("finds stuff data from inputs when not in outputs", () => {
    // Remove all outputs with digest "abc12" — it's only in inputs
    const result = findStuffDataByDigest(mockSpec, "abc12");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("input_doc");
    expect(result!.concept).toBe("Document");
    expect(result!.contentType).toBe("application/pdf");
    expect(result!.dataHtml).toBe('<a href="file:///doc.pdf">doc.pdf</a>');
  });

  it("returns null for unknown digest", () => {
    expect(findStuffDataByDigest(mockSpec, "nonexistent")).toBeNull();
  });

  it("handles empty graph", () => {
    expect(findStuffDataByDigest({ nodes: [], edges: [] }, "abc")).toBeNull();
  });

  it("handles nodes without io", () => {
    const spec: GraphSpec = {
      nodes: [{ id: "n", status: "succeeded" }],
      edges: [],
    };
    expect(findStuffDataByDigest(spec, "abc")).toBeNull();
  });
});
