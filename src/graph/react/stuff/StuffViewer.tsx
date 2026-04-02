import React from "react";
import DOMPurify from "dompurify";

import type { StuffViewerData } from "./stuffViewerTypes";
import { extractUrl, getHtmlTabLabel } from "./stuffViewerUtils";
import "./StuffViewer.css";

type StuffTab = "html" | "json" | "text";

export interface StuffViewerProps {
  stuff: StuffViewerData;
  className?: string;
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

export function StuffViewer({ stuff, className }: StuffViewerProps) {
  const [activeTab, setActiveTab] = React.useState<StuffTab>("html");
  const [copied, setCopied] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const externalUrl = React.useMemo(() => extractUrl(stuff.data), [stuff.data]);
  const htmlTabLabel = getHtmlTabLabel(stuff.contentType);
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

  function renderContent() {
    if (activeTab === "html") {
      // PDF embed
      if (stuff.contentType === "application/pdf") {
        const url = externalUrl;
        if (url) {
          return (
            <div className="stuff-viewer-pdf">
              <embed src={url} type="application/pdf" />
            </div>
          );
        }
        return <div className="stuff-viewer-placeholder">PDF content (no URL available)</div>;
      }

      // Image display
      if (stuff.contentType?.startsWith("image/")) {
        const url = externalUrl;
        if (url) {
          return (
            <div className="stuff-viewer-image">
              <img src={url} alt={stuff.name || "Image content"} />
            </div>
          );
        }
        return <div className="stuff-viewer-placeholder">Image content (no URL available)</div>;
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
    if (stuff.contentType?.startsWith("image/") && externalUrl) {
      const ext = stuff.contentType.split("/")[1] || "png";
      downloadUrl(externalUrl, `${stuff.name || "stuff"}.${ext}`);
      return;
    }

    // For PDFs, download the actual file
    if (stuff.contentType === "application/pdf" && externalUrl) {
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
