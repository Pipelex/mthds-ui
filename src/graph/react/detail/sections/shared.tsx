import React, { useState } from "react";
import type { GraphSpecModelUsage as ModelUsage } from "@graph/types";

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

export function PromptBlock({ label, text }: { label: string; text: string | null | undefined }) {
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
const EXPAND_ICON = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
  </svg>
);

const COLLAPSE_ICON = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </svg>
);

const COPY_ICON = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const promptActionStyle: React.CSSProperties = {
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
};

export function PromptToggle({
  label,
  templateText,
  renderedText,
}: {
  label: string;
  templateText: string | null | undefined;
  renderedText: string | null | undefined;
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasTemplate = !!templateText;
  const hasRendered = !!renderedText;
  if (!hasTemplate && !hasRendered) return null;
  const canToggle = hasTemplate && hasRendered;
  // Show rendered by default when available; fall back to template
  const activeText = canToggle
    ? showTemplate
      ? templateText
      : renderedText
    : templateText || renderedText;

  function handleCopy() {
    if (!activeText || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(activeText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}
      >
        <div className="detail-section-label" style={{ marginBottom: 0 }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Collapse prompt" : "Expand prompt"}
            aria-label={expanded ? "Collapse prompt" : "Expand prompt"}
            className="detail-prompt-expand-btn"
          >
            {expanded ? COLLAPSE_ICON : EXPAND_ICON}
          </button>
          <button
            onClick={handleCopy}
            title="Copy prompt"
            aria-label="Copy prompt"
            style={{
              ...promptActionStyle,
              color: copied ? "#10b981" : "#64748b",
            }}
          >
            {copied ? CHECK_ICON : COPY_ICON}
          </button>
          {canToggle && (
            <button onClick={() => setShowTemplate((prev) => !prev)} style={promptActionStyle}>
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
      </div>
      <div
        className={`detail-prompt-block ${expanded ? "detail-prompt-block--expanded" : "detail-prompt-block--collapsed"}`}
        style={{ marginTop: 6 }}
      >
        {activeText}
      </div>
    </div>
  );
}

/**
 * The Model row: the resolution chain, top to bottom.
 *
 * A model reaches an LLM call through up to three rungs, and which ones are
 * distinct depends on the run:
 *
 *   authored   what the .mthds says      `@default-general`, or a preset `$writing-factual`
 *   handle     execution_data.resolved_model — the LLMSetting's model at capture time.
 *              Confusingly named: in a LIVE run the alias has already been resolved by
 *              the time it is captured, so this reads `claude-4.6-sonnet`; in a DRY run
 *              nothing resolves it and it stays `@default-general`.
 *   ran        usage.by_model — the model that actually served the call (LIVE only).
 *
 * Rendering only the last known rung hides the alias on a live run; rendering only the
 * first hides the model. So all of them are shown, request on top. When they collapse to
 * one value there is one line and nothing to explain.
 *
 * A node that used several models (a PipeLLM's text pass and object pass resolve
 * separately) lists each with its call count. pipelex counts a model per model type and
 * name, since a handle names one model per type, so one name can run twice on a node:
 * as an LLM and as a judgment model. Those entries carry their model type, or the two
 * would print alike and read as one.
 */
export function ModelRows({
  modelsRan,
  authored,
  handle,
  label = "Model",
}: {
  modelsRan?: ModelUsage[];
  /** What the method declares — the truest statement of intent. */
  authored?: string | null;
  /** execution_data.resolved_model: an alias in a dry run, usually concrete in a live one. */
  handle?: string | null;
  label?: string;
}) {
  const ran = modelsRan ?? [];
  const nameCounts = new Map<string, number>();
  for (const entry of ran) {
    nameCounts.set(
      entry.inference_model_name,
      (nameCounts.get(entry.inference_model_name) ?? 0) + 1,
    );
  }
  const ranRungs: ModelRung[] = ran.map((entry, index) => {
    const name =
      (nameCounts.get(entry.inference_model_name) ?? 0) > 1
        ? `${entry.inference_model_name} · ${modelTypeLabel(entry.model_type)}`
        : entry.inference_model_name;
    return {
      key: `ran-${index}`,
      text: ran.length > 1 ? `${name} (${entry.inference_calls})` : name,
    };
  });

  // The requested rungs collapse when they repeat: an authored name that was never
  // aliased resolves to itself, and a handle already concrete names what ran. The rungs
  // that ran never collapse, since each is a model pipelex counted on its own.
  const requested: ModelRung[] = [];
  const requestedRungs: ModelRung[] = [
    { key: "authored", text: authored ?? "" },
    { key: "handle", text: handle ?? "" },
  ];
  for (const rung of requestedRungs) {
    if (rung.text && rung.text !== requested[requested.length - 1]?.text) requested.push(rung);
  }
  if (ranRungs.length > 0 && requested[requested.length - 1]?.text === ranRungs[0].text) {
    requested.pop();
  }
  const chain = [...requested, ...ranRungs];
  if (chain.length === 0) return null;

  return (
    <div className="detail-kv-row">
      <span className="detail-kv-key">{label}</span>
      <span className="detail-kv-value detail-model-value">
        {chain.map((rung, index) => (
          <span key={rung.key} className={index === 0 ? undefined : "detail-model-resolved"}>
            {rung.text}
          </span>
        ))}
      </span>
    </div>
  );
}

interface ModelRung {
  key: string;
  text: string;
}

/**
 * The words for a usage record's `model_type`, an open set: a type with no entry here
 * prints as itself, its underscores read as spaces.
 */
const MODEL_TYPE_LABELS: Readonly<Record<string, string>> = {
  llm: "LLM",
  extract: "extraction",
  img_gen: "image generation",
  search: "search",
  judgment: "judgment",
};

function modelTypeLabel(modelType: string): string {
  return MODEL_TYPE_LABELS[modelType] ?? modelType.replaceAll("_", " ");
}
