import { describe, it, expect } from "vitest";
import { FOLD_MODE, GRAPH_DIRECTION } from "@graph/types";
import { buildViewerProps } from "../viewerProps";

describe("buildViewerProps", () => {
  describe("foldMode", () => {
    it('falls back to "expanded" when foldMode is missing from rawConfig', () => {
      const props = buildViewerProps({}, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.EXPANDED);
      expect(props.config.foldMode).toBe(FOLD_MODE.EXPANDED);
    });

    it('falls back to "expanded" when rawConfig itself is null', () => {
      const props = buildViewerProps(null, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.EXPANDED);
      expect(props.config.foldMode).toBe(FOLD_MODE.EXPANDED);
    });

    it('propagates "folded" to GraphViewer when set in rawConfig', () => {
      const props = buildViewerProps({ foldMode: "folded" }, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.FOLDED);
      expect(props.config.foldMode).toBe(FOLD_MODE.FOLDED);
    });

    it('propagates "expanded" verbatim when set in rawConfig', () => {
      const props = buildViewerProps({ foldMode: "expanded" }, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.EXPANDED);
      expect(props.config.foldMode).toBe(FOLD_MODE.EXPANDED);
    });

    it('propagates "auto" verbatim when set in rawConfig', () => {
      const props = buildViewerProps({ foldMode: "auto" }, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.AUTO);
      expect(props.config.foldMode).toBe(FOLD_MODE.AUTO);
    });

    it('rejects invalid foldMode values and falls back to "expanded"', () => {
      const props = buildViewerProps({ foldMode: "bogus" }, null);
      expect(props.initialFoldMode).toBe(FOLD_MODE.EXPANDED);
      expect(props.config.foldMode).toBe(FOLD_MODE.EXPANDED);
    });
  });

  describe("other config fields (existing behavior preserved)", () => {
    it("defaults direction to LR and showControllers to false when missing", () => {
      const props = buildViewerProps({}, null);
      expect(props.initialDirection).toBe(GRAPH_DIRECTION.LR);
      expect(props.initialShowControllers).toBe(false);
    });

    it("forwards direction and showControllers from rawConfig", () => {
      const props = buildViewerProps({ direction: "TB", showControllers: true }, null);
      expect(props.initialDirection).toBe(GRAPH_DIRECTION.TB);
      expect(props.initialShowControllers).toBe(true);
      expect(props.config.direction).toBe(GRAPH_DIRECTION.TB);
      expect(props.config.showControllers).toBe(true);
    });

    it("threads the provided graphspec through unchanged", () => {
      const graphspec = { nodes: [], edges: [] };
      const props = buildViewerProps({}, graphspec);
      expect(props.graphspec).toBe(graphspec);
    });
  });
});
