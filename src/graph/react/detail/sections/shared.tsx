import React, { useState } from "react";

// ─── Shared display helpers ────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
}

export function KV({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="detail-kv-row">
      <span className="detail-kv-key">{label}</span>
      <span className="detail-kv-value">{String(value)}</span>
    </div>
  );
}

export function PromptBlock({
  label,
  text,
}: {
  label: string;
  text: string | null | undefined;
}) {
  if (!text) return null;
  return (
    <div>
      <div className="detail-section-label">{label}</div>
      <div className="detail-prompt-block">{text}</div>
    </div>
  );
}

/**
 * Toggle between template and rendered prompt.
 * Default shows rendered (the real prompt that was sent).
 */
export function PromptToggle({
  label,
  templateText,
  renderedText,
}: {
  label: string;
  templateText: string | null | undefined;
  renderedText: string | null | undefined;
}) {
  const hasTemplate = !!templateText;
  const hasRendered = !!renderedText;
  if (!hasTemplate && !hasRendered) return null;

  const [showTemplate, setShowTemplate] = useState(false);
  const activeText = showTemplate ? templateText : renderedText;
  const canToggle = hasTemplate && hasRendered;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="detail-section-label" style={{ marginBottom: 0 }}>
          {label}
        </div>
        {canToggle && (
          <button
            onClick={() => setShowTemplate((prev) => !prev)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              color: "#64748b",
              padding: "2px 6px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "color 0.15s",
            }}
          >
            <span
              style={{
                width: 22,
                height: 12,
                borderRadius: 6,
                background: showTemplate ? "rgba(255,255,255,0.12)" : "#50FA7B33",
                position: "relative",
                display: "inline-block",
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: showTemplate ? 2 : 12,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: showTemplate ? "#94a3b8" : "#50FA7B",
                  transition: "left 0.15s, background 0.15s",
                }}
              />
            </span>
            {showTemplate ? "template" : "rendered"}
          </button>
        )}
      </div>
      <div className="detail-prompt-block" style={{ marginTop: 6 }}>
        {activeText}
      </div>
    </div>
  );
}
