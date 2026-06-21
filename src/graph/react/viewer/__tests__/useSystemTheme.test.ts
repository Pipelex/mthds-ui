import { describe, it, expect, afterEach } from "vitest";
import { GRAPH_THEME } from "@graph/types";
import {
  detectSystemTheme,
  prefersDarkToTheme,
  subscribeToSystemTheme,
  systemThemeStore,
} from "../useSystemTheme";

/**
 * Unit tests for the `useSystemTheme` building blocks. The hook itself only wires
 * `systemThemeStore` into `useSyncExternalStore`; the substance lives in the pure
 * seams (`detectSystemTheme`, `subscribeToSystemTheme`, `systemThemeStore`),
 * which we exercise here without a DOM by stubbing `globalThis.window`.
 */

const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

function stubMatchMedia(matches: boolean): void {
  (globalThis as { window?: unknown }).window = {
    matchMedia: (query: string) => ({ matches: query.includes("dark") ? matches : !matches }),
  };
}

type ChangeHandler = () => void;

interface MockMql {
  matches: boolean;
  /** Fire a `prefers-color-scheme` change to every registered listener. */
  dispatch: () => void;
  /** Per-API call counts so a test can assert which path was taken. */
  added: { modern: number; legacy: number };
  removed: { modern: number; legacy: number };
  /** Number of times `window.matchMedia` itself was invoked. */
  matchMediaCalls: () => number;
}

/**
 * Install a mock `window.matchMedia` exposing exactly one of the two
 * `MediaQueryList` APIs. `legacy: true` omits `addEventListener` entirely so the
 * `subscribeToSystemTheme` feature-guard must fall through to `addListener`.
 */
function installMockMatchMedia(opts: { matches: boolean; legacy?: boolean }): MockMql {
  const listeners = new Set<ChangeHandler>();
  const added = { modern: 0, legacy: 0 };
  const removed = { modern: 0, legacy: 0 };
  let matchMediaCalls = 0;

  const mql: Record<string, unknown> = { matches: opts.matches };
  if (opts.legacy) {
    mql.addListener = (cb: ChangeHandler) => {
      added.legacy += 1;
      listeners.add(cb);
    };
    mql.removeListener = (cb: ChangeHandler) => {
      removed.legacy += 1;
      listeners.delete(cb);
    };
  } else {
    mql.addEventListener = (_type: string, cb: ChangeHandler) => {
      added.modern += 1;
      listeners.add(cb);
    };
    mql.removeEventListener = (_type: string, cb: ChangeHandler) => {
      removed.modern += 1;
      listeners.delete(cb);
    };
  }

  (globalThis as { window?: unknown }).window = {
    matchMedia: () => {
      matchMediaCalls += 1;
      return mql;
    },
  };

  return {
    matches: opts.matches,
    dispatch: () => listeners.forEach((cb) => cb()),
    added,
    removed,
    matchMediaCalls: () => matchMediaCalls,
  };
}

describe("prefersDarkToTheme", () => {
  it("maps a dark match to the dark theme and otherwise to light", () => {
    expect(prefersDarkToTheme(true)).toBe(GRAPH_THEME.DARK);
    expect(prefersDarkToTheme(false)).toBe(GRAPH_THEME.LIGHT);
  });
});

describe("detectSystemTheme", () => {
  it("defaults to dark when window/matchMedia is unavailable (SSR-safe)", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(detectSystemTheme()).toBe(GRAPH_THEME.DARK);
  });

  it("returns dark when the environment prefers a dark color scheme", () => {
    stubMatchMedia(true);
    expect(detectSystemTheme()).toBe(GRAPH_THEME.DARK);
  });

  it("returns light when the environment prefers a light color scheme", () => {
    stubMatchMedia(false);
    expect(detectSystemTheme()).toBe(GRAPH_THEME.LIGHT);
  });
});

describe("subscribeToSystemTheme", () => {
  it("subscribes via the modern addEventListener API and fires onChange on a change", () => {
    const mql = installMockMatchMedia({ matches: true });
    let fired = 0;
    const unsubscribe = subscribeToSystemTheme(() => {
      fired += 1;
    });
    expect(mql.added).toEqual({ modern: 1, legacy: 0 });
    mql.dispatch();
    expect(fired).toBe(1);
    unsubscribe();
  });

  it("removes the modern listener on cleanup (no more change callbacks)", () => {
    const mql = installMockMatchMedia({ matches: true });
    let fired = 0;
    const unsubscribe = subscribeToSystemTheme(() => {
      fired += 1;
    });
    unsubscribe();
    expect(mql.removed).toEqual({ modern: 1, legacy: 0 });
    mql.dispatch();
    expect(fired).toBe(0);
  });

  it("falls back to the legacy addListener API without throwing, and still fires", () => {
    // The webview host class the systemTheme prop exists for: MediaQueryList
    // with only addListener/removeListener. Calling addEventListener here would
    // throw inside useSyncExternalStore's subscribe and blank the whole graph.
    const mql = installMockMatchMedia({ matches: true, legacy: true });
    let fired = 0;
    let unsubscribe: () => void = () => {};
    expect(() => {
      unsubscribe = subscribeToSystemTheme(() => {
        fired += 1;
      });
    }).not.toThrow();
    expect(mql.added).toEqual({ modern: 0, legacy: 1 });
    mql.dispatch();
    expect(fired).toBe(1);
    unsubscribe();
    expect(mql.removed).toEqual({ modern: 0, legacy: 1 });
  });

  it("is a no-op (no throw) when window/matchMedia is unavailable (SSR-safe)", () => {
    delete (globalThis as { window?: unknown }).window;
    let unsubscribe: () => void = () => {};
    expect(() => {
      unsubscribe = subscribeToSystemTheme(() => {});
      unsubscribe();
    }).not.toThrow();
  });
});

describe("systemThemeStore", () => {
  it("with an injected value: registers no matchMedia listener and returns it from both snapshots", () => {
    const mql = installMockMatchMedia({ matches: true });
    const store = systemThemeStore(GRAPH_THEME.LIGHT);
    let fired = 0;
    const unsubscribe = store.subscribe(() => {
      fired += 1;
    });
    // The host owns detection — the store must not touch matchMedia at all.
    expect(mql.matchMediaCalls()).toBe(0);
    expect(mql.added).toEqual({ modern: 0, legacy: 0 });
    expect(store.getSnapshot()).toBe(GRAPH_THEME.LIGHT);
    expect(store.getServerSnapshot()).toBe(GRAPH_THEME.LIGHT);
    mql.dispatch();
    expect(fired).toBe(0);
    unsubscribe();
  });

  it("without an injected value: resolves live from matchMedia, server snapshot defaults to dark", () => {
    const mql = installMockMatchMedia({ matches: false }); // environment prefers light
    const store = systemThemeStore();
    expect(store.getSnapshot()).toBe(GRAPH_THEME.LIGHT);
    expect(store.getServerSnapshot()).toBe(GRAPH_THEME.DARK);
    let fired = 0;
    const unsubscribe = store.subscribe(() => {
      fired += 1;
    });
    mql.dispatch();
    expect(fired).toBe(1);
    unsubscribe();
  });
});
