import { describe, it, expect } from "vitest";
import { TOOLBAR_POSITION } from "@graph/types";
import { resolveToolbarPosition } from "../GraphViewer";

/**
 * `resolveToolbarPosition` is the controlled/reactive precedence resolver for the
 * toolbar anchor. It mirrors `resolveExternalThemeMode`:
 * - the `toolbarPosition` prop wins when set,
 * - falls back to `config.toolbarPosition` when the prop is undefined (so a host
 *   can hand control back to config after passing it as a prop),
 * - falls back to the library default (`top-right`) when neither is set.
 */
describe("resolveToolbarPosition", () => {
  it("returns the prop when set, ignoring config.toolbarPosition", () => {
    expect(
      resolveToolbarPosition(TOOLBAR_POSITION.CENTER_LEFT, TOOLBAR_POSITION.BOTTOM_RIGHT),
    ).toBe(TOOLBAR_POSITION.CENTER_LEFT);
    expect(resolveToolbarPosition(TOOLBAR_POSITION.TOP_LEFT, TOOLBAR_POSITION.TOP_RIGHT)).toBe(
      TOOLBAR_POSITION.TOP_LEFT,
    );
  });

  it("falls back to config.toolbarPosition when the prop is undefined", () => {
    expect(resolveToolbarPosition(undefined, TOOLBAR_POSITION.CENTER_RIGHT)).toBe(
      TOOLBAR_POSITION.CENTER_RIGHT,
    );
    expect(resolveToolbarPosition(undefined, TOOLBAR_POSITION.BOTTOM_CENTER)).toBe(
      TOOLBAR_POSITION.BOTTOM_CENTER,
    );
  });

  it("falls back to top-right when both inputs are undefined", () => {
    expect(resolveToolbarPosition(undefined, undefined)).toBe(TOOLBAR_POSITION.TOP_RIGHT);
  });

  it("treats prop clearing as an external change (no prev-value stickiness)", () => {
    // Going from a concrete value back to undefined must resolve to the config
    // fallback, not the previously-set prop value.
    const before = resolveToolbarPosition(TOOLBAR_POSITION.CENTER_LEFT, TOOLBAR_POSITION.TOP_RIGHT);
    const after = resolveToolbarPosition(undefined, TOOLBAR_POSITION.TOP_RIGHT);
    expect(before).toBe(TOOLBAR_POSITION.CENTER_LEFT);
    expect(after).toBe(TOOLBAR_POSITION.TOP_RIGHT);
    expect(after).not.toBe(before);
  });

  it("reacts to config.toolbarPosition changes when the prop is undefined", () => {
    expect(resolveToolbarPosition(undefined, TOOLBAR_POSITION.TOP_LEFT)).toBe(
      TOOLBAR_POSITION.TOP_LEFT,
    );
    expect(resolveToolbarPosition(undefined, TOOLBAR_POSITION.BOTTOM_LEFT)).toBe(
      TOOLBAR_POSITION.BOTTOM_LEFT,
    );
  });

  it("round-trips controlled→uncontrolled→controlled through the config fallback", () => {
    const configPosition = TOOLBAR_POSITION.TOP_RIGHT;
    const step1 = resolveToolbarPosition(TOOLBAR_POSITION.CENTER_LEFT, configPosition);
    const step2 = resolveToolbarPosition(undefined, configPosition);
    const step3 = resolveToolbarPosition(TOOLBAR_POSITION.CENTER_LEFT, configPosition);
    expect(step1).toBe(TOOLBAR_POSITION.CENTER_LEFT);
    expect(step2).toBe(TOOLBAR_POSITION.TOP_RIGHT);
    expect(step3).toBe(TOOLBAR_POSITION.CENTER_LEFT);
    expect(step2).not.toBe(step1);
    expect(step2).not.toBe(step3);
  });
});
