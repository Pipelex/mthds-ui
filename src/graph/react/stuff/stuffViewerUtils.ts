import type { GraphSpec } from "@graph/types";
import type { StuffViewerData } from "./stuffViewerTypes";

/** Check whether a URL is safe for links/downloads (no javascript: or data: injection). */
export function isSafeDisplayUrl(url: unknown): url is string {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("file://") ||
    url.startsWith("/")
  );
}

/** Check whether a URL can be rendered inline in an <img> or <embed> tag. */
export function isInlineRenderableUrl(url: unknown): url is string {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("file://") ||
    url.startsWith("/")
  );
}

/**
 * Extract a displayable URL from stuff data (for links, downloads, open-external).
 * Prefers public_url (pre-signed S3 / file:// URI) over internal pipelex-storage:// URLs.
 * Returns null for unsafe or missing URLs.
 */
export function extractUrl(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    return isSafeDisplayUrl(data) ? data : null;
  }
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const candidates = [obj.public_url, obj.src, obj.href, obj.uri, obj.url];
  for (const candidate of candidates) {
    if (isSafeDisplayUrl(candidate)) return candidate;
  }
  return null;
}

/**
 * Extract a URL that can be rendered inline in <img>/<embed> tags.
 * Only returns http/https URLs — file:// URLs are safe for links but browsers
 * block them from inline rendering in web contexts.
 */
export function extractInlineUrl(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    return isInlineRenderableUrl(data) ? data : null;
  }
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const candidates = [obj.public_url, obj.src, obj.href, obj.uri, obj.url];
  for (const candidate of candidates) {
    if (isInlineRenderableUrl(candidate)) return candidate;
  }
  return null;
}

/** Extract the filename from stuff data, if available. */
export function extractFilename(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.filename === "string" && obj.filename) return obj.filename;
  return null;
}

/** Get the appropriate first-tab label based on content MIME type. */
export function getHtmlTabLabel(contentType?: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType?.startsWith("image/")) return "Image";
  return "HTML";
}

/**
 * Find stuff data by digest in a GraphSpec.
 * Scans all nodes' IO items — outputs first (producer data), then inputs as fallback.
 */
export function findStuffDataByDigest(
  graphspec: GraphSpec,
  digest: string,
): StuffViewerData | null {
  // First pass: look in outputs (producer has the richest data)
  for (const node of graphspec.nodes) {
    for (const output of node.io?.outputs ?? []) {
      if (output.digest === digest) {
        return {
          digest,
          name: output.name,
          concept: output.concept,
          contentType: output.content_type,
          data: output.data,
          dataText: output.data_text,
          dataHtml: output.data_html,
        };
      }
    }
  }

  // Second pass: look in inputs (for pipeline-level inputs without a producer)
  for (const node of graphspec.nodes) {
    for (const input of node.io?.inputs ?? []) {
      if (input.digest === digest) {
        return {
          digest,
          name: input.name,
          concept: input.concept,
          contentType: input.content_type,
          data: input.data,
          dataText: input.data_text,
          dataHtml: input.data_html,
        };
      }
    }
  }

  return null;
}
