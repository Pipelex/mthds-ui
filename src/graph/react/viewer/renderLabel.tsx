import React from "react";
import type { LabelDescriptor, GraphNode } from "@graph/types";

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
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
        title={desc.label}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-pipe-text)",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {desc.label}
        </span>
      </div>
    );
  }

  // desc.kind === "stuff"
  // width: 100% + min-width: 0 lets the flex children's overflow/ellipsis
  // actually kick in — without it, the spans would stretch the parent instead.
  return (
    <div
      style={{
        padding: "8px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
      title={desc.concept ? `${desc.label}: ${desc.concept}` : desc.label}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--color-stuff-text)",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {desc.label}
      </span>
      {desc.concept && (
        <span
          style={{
            fontSize: "14px",
            color: "var(--color-stuff-text-dim)",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {desc.concept}
        </span>
      )}
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
