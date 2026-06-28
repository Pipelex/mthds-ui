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
});
