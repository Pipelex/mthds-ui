import React from "react";
import type { LabelDescriptor, GraphNode } from "../../types";

export function renderLabel(desc: LabelDescriptor): React.ReactNode {
  if (desc.kind === "pipe") {
    return (
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-pipe-text)",
          }}
        >
          {desc.label}
        </span>
      </div>
    );
  }

  if (desc.kind === "stuff") {
    return (
      <div
        style={{
          padding: "8px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-stuff-text)",
          }}
        >
          {desc.label}
        </span>
        {desc.concept && (
          <span
            style={{
              fontSize: "14px",
              color: "var(--color-stuff-text-dim)",
            }}
          >
            {desc.concept}
          </span>
        )}
      </div>
    );
  }

  // orchestration
  const isSucceeded = desc.status === "succeeded";
  const isFailed = desc.status === "failed";
  return (
    <div
      style={{
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-pipe-text)",
          }}
        >
          {desc.label}
        </span>
        {isSucceeded && (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-success)",
              flexShrink: 0,
            }}
          />
        )}
        {isFailed && (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-error)",
              flexShrink: 0,
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "var(--color-text-dim)",
          }}
        >
          {desc.typeText}
        </span>
        {desc.badge && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--color-text-muted)",
              background: "var(--color-surface-hover)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {desc.badge}
          </span>
        )}
      </div>
    </div>
  );
}

/** Convert label descriptors to React elements on all nodes */
export function hydrateLabels(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((n) => {
    if (!n.data.labelDescriptor) return n;
    return {
      ...n,
      data: {
        ...n.data,
        label: renderLabel(n.data.labelDescriptor),
      },
    };
  });
}
