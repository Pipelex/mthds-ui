import React from "react";
import DOMPurify from "dompurify";

import type { ResolveStorageUrl, StuffViewerData } from "./stuffViewerTypes";
import {
  extractFilename,
  extractInlineUrl,
  extractStorageUri,
  extractUrl,
  getHtmlTabLabel,
  resolveMimeType,
} from "./stuffViewerUtils";
import "./StuffViewer.css";

type StuffTab = "html" | "json" | "text";

export interface StuffViewerProps {
  stuff: StuffViewerData;
  className?: string;
  /**
   * Resolver for `pipelex-storage://` URIs. If provided and the stuff data
   * references an internal URI, the viewer will call this to obtain a
   * presigned URL for inline rendering. Without a resolver, media with only
   * internal URIs falls back to the "no preview" placeholder.
   */
  resolveStorageUrl?: ResolveStorageUrl;
}

// ─── SVG icon paths ──────────────────────────────────────────────────────────

const ICON_COPY = (
  <svg viewBox="0 0 24 24">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const ICON_CHECK = (
  <svg viewBox="0 0 24 24">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const ICON_DOWNLOAD = (
  <svg viewBox="0 0 24 24">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const ICON_EXTERNAL = (
  <svg viewBox="0 0 24 24">
    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
  </svg>
);

const ICON_LOCAL_FILE = (
  <svg viewBox="0 0 24 24">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Defer revocation so the browser has time to start reading the blob
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.click();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StuffViewer({ stuff, className, resolveStorageUrl }: StuffViewerProps) {
  const [activeTab, setActiveTab] = React.useState<StuffTab>("html");
  const [copied, setCopied] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // URL for inline rendering (img/embed) — only http/https
  const httpInlineUrl = React.useMemo(() => extractInlineUrl(stuff.data), [stuff.data]);
  // URL for links/downloads — includes file:// too
  const httpExternalUrl = React.useMemo(() => extractUrl(stuff.data), [stuff.data]);
  // Internal pipelex-storage:// URI, if any — needs async resolution before rendering
  const storageUri = React.useMemo(() => extractStorageUri(stuff.data), [stuff.data]);
  const filename = React.useMemo(() => extractFilename(stuff.data), [stuff.data]);

  // Resolve pipelex-storage:// URIs to browser-fetchable URLs via the provided resolver.
  // Only runs when no direct http(s) URL is available — we prefer public_url/src/href first.
  const [resolvedStorageUrl, setResolvedStorageUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!storageUri || !resolveStorageUrl || httpInlineUrl) {
      setResolvedStorageUrl(null);
      return;
    }
    let cancelled = false;
    resolveStorageUrl(storageUri)
      .then((url) => {
        if (!cancelled) setResolvedStorageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedStorageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storageUri, resolveStorageUrl, httpInlineUrl]);

  const inlineUrl = httpInlineUrl ?? resolvedStorageUrl;
  const externalUrl = httpExternalUrl ?? resolvedStorageUrl;
  // Effective MIME type: stuff.contentType is often the concept tag ("document"),
  // not a MIME. Fall back to data.mime_type or the file extension.
  const effectiveMime = React.useMemo(
    () => resolveMimeType(stuff.data, stuff.contentType, externalUrl ?? storageUri),
    [stuff.data, stuff.contentType, externalUrl, storageUri],
  );
  const isPdf = effectiveMime === "application/pdf";
  const isImage = effectiveMime?.startsWith("image/") ?? false;
  const htmlTabLabel = getHtmlTabLabel(effectiveMime ?? stuff.contentType);
  const jsonString = React.useMemo(() => {
    if (stuff.data == null) return null;
    try {
      return JSON.stringify(stuff.data, null, 2);
    } catch {
      return "[Unable to serialize data]";
    }
  }, [stuff.data]);

  // Make links in sanitized HTML open in new windows
  React.useEffect(() => {
    if (activeTab !== "html" || !contentRef.current) return;
    contentRef.current.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }, [activeTab, stuff.dataHtml]);

  // ── Tab rendering ────────────────────────────────────────────────────────

  /** Fallback for images/PDFs when no inline-renderable URL is available
   *  (e.g., only pipelex-storage:// internal URLs exist). */
  function renderMediaFallback(mediaLabel: string) {
    const displayName = filename || stuff.name;
    return (
      <div className="stuff-viewer-local-file">
        <div className="stuff-viewer-local-file-icon">{ICON_LOCAL_FILE}</div>
        <div className="stuff-viewer-local-file-info">
          {displayName && (
            <div className="stuff-viewer-local-file-name">{displayName}</div>
          )}
          <div className="stuff-viewer-local-file-hint">
            {mediaLabel} — no preview available
          </div>
        </div>
      </div>
    );
  }

  function renderContent() {
    if (activeTab === "html") {
      // PDF embed
      if (isPdf) {
        if (inlineUrl) {
          // #pagemode=none hides the sidebar/page thumbnails in the browser PDF viewer
          const pdfUrl = inlineUrl.includes("#") ? inlineUrl : `${inlineUrl}#pagemode=none`;
          return (
            <div className="stuff-viewer-pdf">
              <embed src={pdfUrl} type="application/pdf" />
            </div>
          );
        }
        return renderMediaFallback("PDF");
      }

      // Image display
      if (isImage) {
        if (inlineUrl) {
          return (
            <div className="stuff-viewer-image">
              <img src={inlineUrl} alt={stuff.name || "Image content"} />
            </div>
          );
        }
        return renderMediaFallback("Image");
      }

      // HTML content
      if (stuff.dataHtml) {
        return (
          <div
            className="stuff-viewer-html"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stuff.dataHtml) }}
          />
        );
      }

      // Fallback to JSON
      if (jsonString) {
        return (
          <pre
            className="stuff-viewer-pre"
            dangerouslySetInnerHTML={{ __html: escapeHtml(jsonString) }}
          />
        );
      }

      return <div className="stuff-viewer-placeholder">No content available</div>;
    }

    if (activeTab === "json") {
      if (jsonString) {
        return (
          <pre
            className="stuff-viewer-pre"
            dangerouslySetInnerHTML={{ __html: escapeHtml(jsonString) }}
          />
        );
      }
      return <div className="stuff-viewer-placeholder">No JSON data available</div>;
    }

    // text tab
    if (stuff.dataText) {
      return (
        <pre
          className="stuff-viewer-pre stuff-viewer-pre--nowrap"
          dangerouslySetInnerHTML={{ __html: escapeHtml(stuff.dataText) }}
        />
      );
    }
    // Fallback to JSON
    if (jsonString) {
      return (
        <pre
          className="stuff-viewer-pre"
          dangerouslySetInnerHTML={{ __html: escapeHtml(jsonString) }}
        />
      );
    }
    return <div className="stuff-viewer-placeholder">No text data available</div>;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleCopy() {
    let textToCopy: string;
    if (activeTab === "json") {
      textToCopy = jsonString || "";
    } else if (activeTab === "text") {
      textToCopy = stuff.dataText || jsonString || "";
    } else {
      textToCopy = stuff.dataText || stuff.dataHtml || jsonString || "";
    }
    if (!textToCopy) return;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          // Clipboard API may be unavailable in non-secure contexts
        });
    }
  }

  function handleDownload() {
    // For images, download the actual file
    if (isImage && externalUrl) {
      const ext = effectiveMime?.split("/")[1] || "png";
      downloadUrl(externalUrl, `${stuff.name || "stuff"}.${ext}`);
      return;
    }

    // For PDFs, download the actual file
    if (isPdf && externalUrl) {
      downloadUrl(externalUrl, `${stuff.name || "stuff"}.pdf`);
      return;
    }

    // Otherwise download current tab's text content
    if (activeTab === "json") {
      downloadBlob(jsonString || "{}", `${stuff.name || "stuff"}.json`, "application/json");
    } else if (activeTab === "text") {
      downloadBlob(
        stuff.dataText || jsonString || "",
        `${stuff.name || "stuff"}.txt`,
        "text/plain",
      );
    } else {
      downloadBlob(
        stuff.dataHtml || jsonString || "",
        `${stuff.name || "stuff"}.html`,
        "text/html",
      );
    }
  }

  function handleOpenExternal() {
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const rootClass = ["stuff-viewer", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="stuff-viewer-header">
        <h3 className="stuff-viewer-title">{stuff.name || "Data"}</h3>
        {stuff.concept && <p className="stuff-viewer-subtitle">{stuff.concept}</p>}
      </div>

      <div className="stuff-viewer-toolbar">
        <div className="stuff-viewer-tabs">
          {(["html", "json", "text"] as const).map((tab) => {
            const label = tab === "html" ? htmlTabLabel : tab === "json" ? "JSON" : "Pretty";
            const isActive = activeTab === tab;
            return (
              <button
                type="button"
                key={tab}
                className={`stuff-viewer-tab${isActive ? " stuff-viewer-tab--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="stuff-viewer-actions">
          {externalUrl && (
            <button
              type="button"
              className="stuff-viewer-action-btn"
              onClick={handleOpenExternal}
              title="Open in new window"
              aria-label="Open in new window"
            >
              {ICON_EXTERNAL}
            </button>
          )}
          <button
            type="button"
            className={`stuff-viewer-action-btn${copied ? " stuff-viewer-action-btn--copied" : ""}`}
            onClick={handleCopy}
            title="Copy"
            aria-label="Copy"
          >
            {copied ? ICON_CHECK : ICON_COPY}
          </button>
          <button
            type="button"
            className="stuff-viewer-action-btn"
            onClick={handleDownload}
            title="Download"
            aria-label="Download"
          >
            {ICON_DOWNLOAD}
          </button>
        </div>
      </div>

      <div className="stuff-viewer-content" ref={contentRef}>
        {renderContent()}
      </div>
    </div>
  );
}
