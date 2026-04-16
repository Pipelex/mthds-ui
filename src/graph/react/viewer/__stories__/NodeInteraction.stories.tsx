/**
 * Node Interaction — Right side panel for inspecting pipe and stuff nodes.
 *
 * Click a pipe node to see: type, status, timing, description, I/O, tags.
 * Click a stuff (data) node to see: concept, producer, consumers, data preview.
 * Click the same node or the graph background to dismiss.
 */
import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../GraphViewer";
import { LIVE_CV_SCREENING } from "./mockGraphSpec";
import { buildDataflowAnalysis } from "@graph/graphAnalysis";
import { isStuffNodeId, stuffDigestFromId } from "@graph/types";
import type { GraphSpec } from "@graph/types";

const DEMO_SPEC = LIVE_CV_SCREENING;

const meta: Meta = {
  title: "Graph/Interaction Prototypes",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

// ─── Shared Types ───────────────────────────────────────────────────────

interface SelectedNode {
  nodeId: string;
  nodeData: { isPipe: boolean; isStuff: boolean; pipeCode?: string; [k: string]: unknown };
}

// ─── Style Constants ────────────────────────────────────────────────────

const S = {
  panelBg: "#111118",
  panelBorder: "1px solid rgba(255,255,255,0.1)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  fontSans: '"Inter", -apple-system, sans-serif',
  fontMono: '"JetBrains Mono", "Monaco", monospace',
  statusColors: {
    succeeded: "#50FA7B",
    failed: "#FF5555",
    running: "#8BE9FD",
    scheduled: "#6272a4",
    skipped: "#6272a4",
  } as Record<string, string>,
  badgeLabels: {
    PipeLLM: "LLM",
    PipeExtract: "Extract",
    PipeCompose: "Compose",
    PipeImgGen: "ImgGen",
    PipeSearch: "Search",
    PipeFunc: "Func",
    PipeSequence: "Seq",
    PipeParallel: "Par",
    PipeCondition: "Cond",
    PipeBatch: "Batch",
  } as Record<string, string>,
};

// ─── Lookup Helpers ─────────────────────────────────────────────────────

function findSpecNode(spec: GraphSpec, pipeCode: string) {
  return spec.nodes.find((n) => n.pipe_code === pipeCode);
}

function getStuffInfo(spec: GraphSpec, digest: string) {
  const analysis = buildDataflowAnalysis(spec);
  if (!analysis) return null;

  const info = analysis.stuffRegistry[digest];
  if (!info) return null;

  const producerId = analysis.stuffProducers[digest];
  const consumerIds = analysis.stuffConsumers[digest] ?? [];
  const producerNode = producerId ? spec.nodes.find((n) => n.id === producerId) : undefined;
  const consumerNodes = consumerIds
    .map((id) => spec.nodes.find((n) => n.id === id))
    .filter(Boolean);

  // Find data preview from producer output
  let dataPreview: string | undefined;
  if (producerNode?.io?.outputs) {
    for (const out of producerNode.io.outputs) {
      if (out.digest === digest && out.data_text) {
        dataPreview = out.data_text;
        break;
      }
    }
  }

  return {
    name: info.name ?? "data",
    concept: info.concept ?? "",
    contentType: info.contentType,
    producer: producerNode
      ? { code: producerNode.pipe_code ?? "unknown", type: producerNode.pipe_type ?? "" }
      : undefined,
    consumers: consumerNodes.map((n) => ({
      code: n!.pipe_code ?? "unknown",
      type: n!.pipe_type ?? "",
    })),
    dataPreview,
  };
}

// ─── Shared Components ──────────────────────────────────────────────────

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        position: "absolute",
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        color: S.textDim,
        fontSize: 18,
        lineHeight: 1,
        zIndex: 1,
      }}
    >
      ×
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: S.textDim,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function IoPill({
  name,
  concept,
  accentColor,
}: {
  name: string;
  concept: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 4,
        background: accentColor ? `${accentColor}11` : "rgba(255,255,255,0.04)",
        border: `1px solid ${accentColor ? `${accentColor}33` : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span style={{ fontFamily: S.fontMono, color: S.text }}>{name}</span>
      <span style={{ color: S.textDim, fontSize: 10 }}>{concept}</span>
    </div>
  );
}

function ClickHint() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 12,
        color: S.textDim,
        fontFamily: S.fontSans,
        background: "rgba(0,0,0,0.6)",
        padding: "6px 14px",
        borderRadius: 6,
        pointerEvents: "none",
        zIndex: 50,
        whiteSpace: "nowrap",
      }}
    >
      Click any node to inspect
    </div>
  );
}

// ─── PipeDetail ─────────────────────────────────────────────────────────

function PipeDetail({ pipeCode, spec }: { pipeCode: string; spec: GraphSpec }) {
  const raw = findSpecNode(spec, pipeCode) as any;
  if (!raw) return <div style={{ color: S.textMuted, padding: 16 }}>Node not found</div>;

  const status: string = raw.status ?? "scheduled";
  const statusColor = S.statusColors[status] ?? S.textDim;
  const badge = S.badgeLabels[raw.pipe_type ?? ""] ?? raw.pipe_type ?? "Pipe";
  const timing = raw.timing;
  const inputs: any[] = raw.io?.inputs ?? [];
  const outputs: any[] = raw.io?.outputs ?? [];
  const tags: Record<string, string> = raw.tags ?? {};
  const description = raw.description;

  return (
    <div
      style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: S.fontSans,
      }}
    >
      {/* Header: badge + pipe code */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "2px 7px",
            borderRadius: 4,
            background: "#ff6b6b",
            color: "#0e0e0e",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </span>
        <span style={{ fontFamily: S.fontMono, fontSize: 14, fontWeight: 600, color: "#ff6b6b" }}>
          {pipeCode}
        </span>
      </div>

      {/* Status + Duration */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: 12,
            color: statusColor,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          {status}
        </span>
        {timing?.duration != null && (
          <span style={{ fontSize: 11, color: S.textDim, fontFamily: S.fontMono }}>
            {timing.duration < 1
              ? `${(timing.duration * 1000).toFixed(0)}ms`
              : `${timing.duration.toFixed(2)}s`}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p style={{ fontSize: 12, color: S.textMuted, lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>
      )}

      {/* Inputs */}
      {inputs.length > 0 && (
        <div>
          <SectionLabel>Inputs</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {inputs.map((inp: any, i: number) => (
              <IoPill key={i} name={inp.name ?? ""} concept={inp.concept ?? ""} />
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div>
          <SectionLabel>Outputs</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {outputs.map((out: any, i: number) => (
              <IoPill key={i} name={out.name ?? ""} concept={out.concept ?? ""} />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {Object.keys(tags).length > 0 && (
        <div>
          <SectionLabel>Tags</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(tags).map(([key, val]) => (
              <div key={key} style={{ fontSize: 11, display: "flex", gap: 8 }}>
                <span style={{ fontFamily: S.fontMono, color: S.textMuted, flexShrink: 0 }}>
                  {key}
                </span>
                <span
                  style={{
                    color: S.textDim,
                    wordBreak: "break-word",
                    flex: 1,
                    maxHeight: 60,
                    overflow: "hidden",
                  }}
                >
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StuffDetail ────────────────────────────────────────────────────────

function StuffDetail({ digest, spec }: { digest: string; spec: GraphSpec }) {
  const info = getStuffInfo(spec, digest);
  if (!info) return <div style={{ color: S.textMuted, padding: 16 }}>Stuff not found</div>;

  return (
    <div
      style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: S.fontSans,
      }}
    >
      {/* Header */}
      <div>
        <div style={{ fontFamily: S.fontMono, fontSize: 14, fontWeight: 600, color: S.text }}>
          {info.name}
        </div>
        <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>{info.concept}</div>
        {info.contentType && (
          <div style={{ fontSize: 10, color: S.textDim, marginTop: 2, fontFamily: S.fontMono }}>
            {info.contentType}
          </div>
        )}
      </div>

      {/* Produced by */}
      {info.producer && (
        <div>
          <SectionLabel>Produced by</SectionLabel>
          <IoPill
            name={info.producer.code}
            concept={String(info.producer.type)}
            accentColor="#50FA7B"
          />
        </div>
      )}

      {/* Consumed by */}
      {info.consumers.length > 0 && (
        <div>
          <SectionLabel>Consumed by</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {info.consumers.map((c, i) => (
              <IoPill key={i} name={c.code} concept={String(c.type)} accentColor="#8BE9FD" />
            ))}
          </div>
        </div>
      )}

      {/* Data Preview */}
      {info.dataPreview && (
        <div>
          <SectionLabel>Data Preview</SectionLabel>
          <pre
            style={{
              fontSize: 10,
              color: S.textMuted,
              fontFamily: S.fontMono,
              background: "rgba(255,255,255,0.03)",
              padding: 8,
              borderRadius: 4,
              overflow: "hidden",
              maxHeight: 120,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {info.dataPreview.slice(0, 500)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── NodeDetail (dispatcher) ────────────────────────────────────────────

function NodeDetail({ selected, spec }: { selected: SelectedNode; spec: GraphSpec }) {
  if (selected.nodeData.isStuff && isStuffNodeId(selected.nodeId)) {
    return <StuffDetail digest={stuffDigestFromId(selected.nodeId)} spec={spec} />;
  }
  if (selected.nodeData.pipeCode) {
    return <PipeDetail pipeCode={selected.nodeData.pipeCode} spec={spec} />;
  }
  return (
    <div style={{ color: S.textMuted, padding: 16, fontFamily: S.fontSans }}>Unknown node type</div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OPTION A — Right Side Panel
// ═══════════════════════════════════════════════════════════════════════

function RightPanelDemo() {
  const [selected, setSelected] = React.useState<SelectedNode | null>(null);

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ flex: 1, height: "100%", position: "relative", transition: "flex 0.2s" }}>
        <GraphViewer
          graphspec={DEMO_SPEC}
          initialDirection="LR"
          initialShowControllers={true}
          onNodeSelect={(nodeId, nodeData) =>
            setSelected((prev) => (prev?.nodeId === nodeId ? null : { nodeId, nodeData }))
          }
          onPaneClick={() => setSelected(null)}
        />
        {!selected && <ClickHint />}
      </div>
      {selected && (
        <div
          style={{
            width: 340,
            height: "100%",
            background: S.panelBg,
            borderLeft: S.panelBorder,
            overflowY: "auto",
            color: S.text,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <CloseBtn onClick={() => setSelected(null)} />
          <NodeDetail selected={selected} spec={DEMO_SPEC} />
        </div>
      )}
    </div>
  );
}

// ─── Story ──────────────────────────────────────────────────────────────

export const RightPanel: Story = {
  name: "Right Side Panel",
  render: () => <RightPanelDemo />,
};
