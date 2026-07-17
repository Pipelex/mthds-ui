import { describe, it, expect } from "vitest";
import { TOOLBAR_POSITION, VALIDATION_STATE } from "@graph/types";
import { validationIcon } from "../GraphToolbar";
import { validationEmptyText, validationLabel, validationPanelPlacement } from "../ValidationPanel";

/**
 * The validation widget's presentation is a pure mapping over
 * (state, issue count) and the toolbar anchor. These tests lock the labels the
 * button/panel expose to assistive tech, the per-state icon distinctness, and
 * the anchor → dropdown-placement derivation (the panel must always unfold
 * toward the graph, never off-screen).
 */
describe("validationLabel", () => {
  it("describes each state", () => {
    expect(validationLabel(VALIDATION_STATE.VALIDATING, 0)).toBe("Validating method…");
    expect(validationLabel(VALIDATION_STATE.VALID, 0)).toBe("Method is valid");
    expect(validationLabel(VALIDATION_STATE.INVALID, 3)).toBe("Method is invalid — 3 issues");
    expect(validationLabel(VALIDATION_STATE.ERROR, 0)).toBe("Validation could not run");
  });

  it("appends the issue count with singular/plural handling", () => {
    expect(validationLabel(VALIDATION_STATE.INVALID, 1)).toBe("Method is invalid — 1 issue");
    expect(validationLabel(VALIDATION_STATE.VALIDATING, 2)).toBe("Validating method… — 2 issues");
    expect(validationLabel(VALIDATION_STATE.VALID, 1)).toBe("Method is valid — 1 issue");
  });
});

describe("validationEmptyText", () => {
  it("has a fallback body for every state", () => {
    expect(validationEmptyText(VALIDATION_STATE.VALIDATING)).toBe("Validating…");
    expect(validationEmptyText(VALIDATION_STATE.VALID)).toBe("No issues found.");
    expect(validationEmptyText(VALIDATION_STATE.INVALID)).toBe("No details available.");
    expect(validationEmptyText(VALIDATION_STATE.ERROR)).toBe("Validation could not run.");
  });
});

describe("validationIcon", () => {
  it("returns a distinct icon for each state", () => {
    const icons = [
      validationIcon(VALIDATION_STATE.VALIDATING),
      validationIcon(VALIDATION_STATE.VALID),
      validationIcon(VALIDATION_STATE.INVALID),
      validationIcon(VALIDATION_STATE.ERROR),
    ];
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe("validationPanelPlacement", () => {
  it("drops down from top anchors and up from bottom anchors", () => {
    expect(validationPanelPlacement(TOOLBAR_POSITION.TOP_LEFT)).toBe("down-start");
    expect(validationPanelPlacement(TOOLBAR_POSITION.TOP_CENTER)).toBe("down-start");
    expect(validationPanelPlacement(TOOLBAR_POSITION.TOP_RIGHT)).toBe("down-end");
    expect(validationPanelPlacement(TOOLBAR_POSITION.BOTTOM_LEFT)).toBe("up-start");
    expect(validationPanelPlacement(TOOLBAR_POSITION.BOTTOM_CENTER)).toBe("up-start");
    expect(validationPanelPlacement(TOOLBAR_POSITION.BOTTOM_RIGHT)).toBe("up-end");
  });

  it("opens sideways away from the hugged edge for vertical toolbars", () => {
    expect(validationPanelPlacement(TOOLBAR_POSITION.CENTER_LEFT)).toBe("side-end");
    expect(validationPanelPlacement(TOOLBAR_POSITION.CENTER_RIGHT)).toBe("side-start");
  });
});
