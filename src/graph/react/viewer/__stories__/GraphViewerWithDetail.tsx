/**
 * GraphViewer with integrated detail panel.
 * Wraps GraphViewer + DetailPanel so pipeline stories get click-to-inspect for free.
 */
import React, { useState } from "react";
import { GraphViewer } from "../GraphViewer";
import type { GraphViewerProps } from "../GraphViewer";
import { DetailPanel } from "../../detail/DetailPanel";
import { PipeDetailPanel } from "../../detail/PipeDetailPanel";
import { ConceptDetailPanel } from "../../detail/ConceptDetailPanel";
import { stuffDigestFromId } from "@graph/types";
import type { GraphNodeData, ConceptInfo } from "@graph/types";
import { resolveConceptRef } from "@graph/graphAnalysis";
import { findStuffDataByDigest } from "../../stuff/stuffViewerUtils";
import { StuffViewer } from "../../stuff/StuffViewer";

interface SelectedState {
  kind: "pipe" | "stuff" | "concept";
  nodeId: string;
  nodeData: GraphNodeData;
}

export function GraphViewerWithDetail(props: GraphViewerProps) {
  const [selected, setSelected] = useState<SelectedState | null>(null);
  const [conceptDetail, setConceptDetail] = useState<ConceptInfo | null>(null);
  const spec = props.graphspec;

  function handleNodeSelect(nodeId: string, nodeData: GraphNodeData) {
    // Toggle off if clicking the same node
    if (selected?.nodeId === nodeId && !conceptDetail) {
      setSelected(null);
      return;
    }
    setConceptDetail(null);

    if (nodeData.isStuff) {
      setSelected({ kind: "stuff", nodeId, nodeData });
    } else if (nodeData.isPipe) {
      setSelected({ kind: "pipe", nodeId, nodeData });
    }
  }

  function handlePaneClick() {
    setSelected(null);
    setConceptDetail(null);
  }

  function handleConceptClick(conceptCode: string) {
    if (!spec) return;
    const info = resolveConceptRef(spec, conceptCode);
    if (info) {
      setConceptDetail(info);
    }
  }

  // Find the GraphSpecNode for a selected pipe
  const selectedSpecNode =
    selected?.kind === "pipe" && spec
      ? spec.nodes.find((n) => n.pipe_code === selected.nodeData.pipeCode)
      : undefined;

  // Find stuff data for a selected stuff node
  const stuffData =
    selected?.kind === "stuff" && spec
      ? findStuffDataByDigest(spec, stuffDigestFromId(selected.nodeId))
      : undefined;

  const panelOpen = selected !== null || conceptDetail !== null;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GraphViewer
        {...props}
        onNodeSelect={handleNodeSelect}
        onPaneClick={handlePaneClick}
      />
      <DetailPanel isOpen={panelOpen} onClose={handlePaneClick}>
        {conceptDetail ? (
          <ConceptDetailPanel concept={conceptDetail} />
        ) : selectedSpecNode && spec ? (
          <PipeDetailPanel
            node={selectedSpecNode}
            spec={spec}
            onConceptClick={handleConceptClick}
          />
        ) : stuffData ? (
          <StuffViewer stuff={stuffData} />
        ) : null}
      </DetailPanel>
    </div>
  );
}
