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

/** Check whether a URL can be rendered inline in an <img> or <embed> tag.
 *  Allows http://, https://, file:// (local dev / Electron), and relative paths. */
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
 * Returns http/https, file://, and relative URLs.
 * Internal schemes like pipelex-storage:// are excluded.
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

/**
 * Extract a `pipelex-storage://` URI from stuff data, if present.
 *
 * Pipelex-storage URIs are internal logical pointers that need to be resolved
 * to a browser-fetchable URL (e.g. presigned S3) before rendering inline.
 */
export function extractStorageUri(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    return data.startsWith("pipelex-storage://") ? data : null;
  }
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const candidates = [obj.uri, obj.url, obj.src, obj.href];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("pipelex-storage://")) {
      return candidate;
    }
  }
  return null;
}

/**
 * Extract the `inner_html` of a native MTHDS `Html` concept from stuff data.
 *
 * The `Html` native concept (and anything refining it) carries its content in an
 * `inner_html` string field (paired with `css_class`). This can appear either:
 *   - directly, when the stuff *is* an `Html` concept — `{ inner_html, css_class }`
 *   - wrapped, when the stuff is a structured concept holding an `Html` field —
 *     e.g. `{ title, date, html_repr: { inner_html, css_class } }`
 *
 * We look at the top level first, then one level deep into object-valued fields,
 * returning the first non-empty `inner_html` found. Whitespace-only values are
 * treated as absent (nothing to render). Returns null when no `Html` concept is
 * present, so the caller can fall back to the normal HTML/JSON rendering paths.
 */
export function extractInnerHtml(data: unknown): string | null {
  const fromObject = (obj: Record<string, unknown>): string | null => {
    const value = obj.inner_html;
    if (typeof value === "string" && value.trim() !== "") return value;
    return null;
  };

  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;

  const direct = fromObject(obj);
  if (direct != null) return direct;

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = fromObject(value as Record<string, unknown>);
      if (nested != null) return nested;
    }
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

/**
 * Determine the effective MIME type of a stuff item for preview rendering.
 *
 * Checks (in order):
 *   1. Stuff-level `contentType` (when it's already a MIME type like "application/pdf")
 *   2. The `mime_type` field on the data object (Document content carries this)
 *   3. The file extension from `filename` or from the URL/URI
 *
 * The concept-level `contentType` (e.g. "document") is not a MIME type; we
 * ignore it and look at the data instead. Returns null when nothing recognizable
 * is found.
 */
export function resolveMimeType(
  data: unknown,
  contentType: string | undefined,
  url: string | null,
): string | null {
  // 1. Already a MIME type
  if (contentType && contentType.includes("/")) return contentType;

  // 2. data.mime_type field
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.mime_type === "string" && obj.mime_type) return obj.mime_type;
  }

  // 3. Guess from extension
  const source = extractFilename(data) || url || (typeof data === "string" ? data : null);
  if (source) {
    const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = match?.[1]?.toLowerCase();
    if (ext) {
      if (ext === "pdf") return "application/pdf";
      if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
        return `image/${ext === "jpg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext}`;
      }
    }
  }

  return null;
}

/** Get the appropriate first-tab label based on content MIME type. */
export function getHtmlTabLabel(contentType?: string | null): string {
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
