import { describe, it, expect } from "vitest";
import { FOLD_MODE, GRAPH_DIRECTION, GRAPH_THEME_MODE } from "@graph/types";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";
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

    it("throws on a present but invalid foldMode instead of silently coercing", () => {
      expect(() => buildViewerProps({ foldMode: "bogus" }, null)).toThrow(/Invalid foldMode/);
    });
  });

  describe("theme", () => {
    it("defaults to system when theme is missing from rawConfig", () => {
      const props = buildViewerProps({}, null);
      expect(props.theme).toBe(GRAPH_THEME_MODE.SYSTEM);
      expect(props.config.theme).toBe(GRAPH_THEME_MODE.SYSTEM);
    });

    it("defaults to system when rawConfig itself is null", () => {
      const props = buildViewerProps(null, null);
      expect(props.theme).toBe(GRAPH_THEME_MODE.SYSTEM);
      expect(props.config.theme).toBe(GRAPH_THEME_MODE.SYSTEM);
    });

    it.each([GRAPH_THEME_MODE.DARK, GRAPH_THEME_MODE.LIGHT, GRAPH_THEME_MODE.SYSTEM])(
      "propagates valid theme mode %s verbatim",
      (theme) => {
        const props = buildViewerProps({ theme }, null);
        expect(props.theme).toBe(theme);
        expect(props.config.theme).toBe(theme);
      },
    );

    it("accepts the legacy `system` value (not coerced) — closes the cross-repo break", () => {
      // pipelex emits `data-theme="system"` / `config.theme = "system"`; the
      // standalone must accept it, not silently coerce it (which previously hid
      // both the producer mismatch and any genuine typo).
      const props = buildViewerProps({ theme: "system" }, null);
      expect(props.theme).toBe(GRAPH_THEME_MODE.SYSTEM);
    });

    it("throws on a present but invalid theme instead of silently coercing", () => {
      // Matches parseFoldMode / parseDirection: a malformed value (`drak` typo,
      // a stale token) must surface, not render as the default.
      expect(() => buildViewerProps({ theme: "drak" }, null)).toThrow(/Invalid theme/);
      expect(() => buildViewerProps({ theme: "midnight" }, null)).toThrow(/Invalid theme/);
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

    it.each([GRAPH_DIRECTION.TB, GRAPH_DIRECTION.BT, GRAPH_DIRECTION.LR, GRAPH_DIRECTION.RL])(
      "propagates valid direction %s verbatim",
      (dir) => {
        const props = buildViewerProps({ direction: dir }, null);
        expect(props.initialDirection).toBe(dir);
        expect(props.config.direction).toBe(dir);
      },
    );

    it("throws on a present but invalid direction instead of silently coercing", () => {
      // A truthy invalid direction (e.g. "horizontal") would crash layout when
      // portSides[direction] is undefined — fail loudly at the config boundary.
      expect(() => buildViewerProps({ direction: "horizontal" }, null)).toThrow(
        /Invalid direction/,
      );
    });

    it("threads the provided graphspec through unchanged", () => {
      const graphspec = { nodes: [], edges: [] };
      const props = buildViewerProps({}, graphspec);
      expect(props.graphspec).toBe(graphspec);
    });
  });

  describe("GraphConfig key parity (regression guard)", () => {
    // Guards against the v0.6.2-shape bug: a new field added to `GraphConfig`
    // (and `DEFAULT_GRAPH_CONFIG`) silently fails to reach `GraphViewer`
    // because `buildViewerProps` doesn't forward it. With the spread-and-
    // override implementation, this passes by construction — and fails loudly
    // if someone reverts to cherry-picking without listing every field.
    it("forwards every GraphConfig key that DEFAULT_GRAPH_CONFIG defines", () => {
      const { config } = buildViewerProps({ ...DEFAULT_GRAPH_CONFIG }, null);
      const expectedKeys = Object.keys(DEFAULT_GRAPH_CONFIG).sort();
      const actualKeys = Object.keys(config).sort();
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
    });

    it("forwards arbitrary keys that DEFAULT_GRAPH_CONFIG doesn't define", () => {
      // Future-proofing: spread means any key in the rawConfig blob reaches
      // GraphViewer, even one this version of mthds-ui doesn't recognize.
      // GraphViewer ignores keys it doesn't use; the adapter doesn't filter.
      const { config } = buildViewerProps({ unknownKey: "value" }, null);
      expect((config as Record<string, unknown>).unknownKey).toBe("value");
    });
  });
});
