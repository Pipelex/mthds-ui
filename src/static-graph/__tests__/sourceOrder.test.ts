import { describe, it, expect } from "vitest";
import {
  hasTopLevelMainPipe,
  orderMthdsSources,
  selectPrimaryMthdsSource,
  type MthdsSource,
} from "../sourceOrder";

const WITH_MAIN = 'domain = "demo"\nmain_pipe = "run"\n\n[pipe.run]\ntype = "PipeLLM"\n';
const WITHOUT_MAIN = 'domain = "demo"\n\n[pipe.helper]\ntype = "PipeLLM"\n';

function source(name: string, content: string): MthdsSource {
  return { name, content };
}

function names(sources: MthdsSource[]): string[] {
  return sources.map((entry) => entry.name);
}

describe("hasTopLevelMainPipe", () => {
  it("finds a double- or single-quoted main_pipe before the first table", () => {
    expect(hasTopLevelMainPipe('main_pipe = "run"')).toBe(true);
    expect(hasTopLevelMainPipe("main_pipe = 'run'")).toBe(true);
    expect(hasTopLevelMainPipe('  main_pipe="run"  # the entry point')).toBe(true);
  });

  it("reads Windows and old-Mac line endings", () => {
    expect(hasTopLevelMainPipe('domain = "demo"\r\nmain_pipe = "run"\r\n')).toBe(true);
    expect(hasTopLevelMainPipe('domain = "demo"\rmain_pipe = "run"\r')).toBe(true);
  });

  it("ignores a main_pipe key inside a table", () => {
    expect(hasTopLevelMainPipe('domain = "demo"\n[pipe.run]\nmain_pipe = "run"\n')).toBe(false);
  });

  it("is false for a file that declares none, and for an empty value", () => {
    expect(hasTopLevelMainPipe(WITHOUT_MAIN)).toBe(false);
    expect(hasTopLevelMainPipe('main_pipe = ""')).toBe(false);
    expect(hasTopLevelMainPipe("")).toBe(false);
  });

  it("still finds the entry point when a syntax error follows it", () => {
    // An editor asks about half-written files; the scan must not need a parse.
    expect(hasTopLevelMainPipe('main_pipe = "run"\n[pipe.run\ntype = ')).toBe(true);
  });
});

describe("selectPrimaryMthdsSource", () => {
  it("leads with the only file declaring main_pipe", () => {
    const sources = [source("helpers.mthds", WITHOUT_MAIN), source("entry.mthds", WITH_MAIN)];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("entry.mthds");
  });

  it("prefers bundle.mthds when several files declare main_pipe", () => {
    const sources = [
      source("alpha.mthds", WITH_MAIN),
      source("bundle.mthds", WITH_MAIN),
      source("zeta.mthds", WITH_MAIN),
    ];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("bundle.mthds");
  });

  it("matches bundle.mthds by its last path segment, whatever the case", () => {
    const sources = [source("alpha.mthds", WITH_MAIN), source("method/Bundle.MTHDS", WITH_MAIN)];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("method/Bundle.MTHDS");
    const windows = [source("alpha.mthds", WITH_MAIN), source("method\\bundle.mthds", WITH_MAIN)];
    expect(selectPrimaryMthdsSource(windows)?.name).toBe("method\\bundle.mthds");
  });

  it("does not promote a bundle.mthds that declares no main_pipe", () => {
    const sources = [source("bundle.mthds", WITHOUT_MAIN), source("entry.mthds", WITH_MAIN)];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("entry.mthds");
  });

  it("takes the first of several main_pipe files when none is bundle.mthds", () => {
    const sources = [
      source("helpers.mthds", WITHOUT_MAIN),
      source("second.mthds", WITH_MAIN),
      source("third.mthds", WITH_MAIN),
    ];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("second.mthds");
  });

  it("falls back to the first file when none declares main_pipe", () => {
    const sources = [source("one.mthds", WITHOUT_MAIN), source("two.mthds", WITHOUT_MAIN)];
    expect(selectPrimaryMthdsSource(sources)?.name).toBe("one.mthds");
  });

  it("returns undefined for an empty list", () => {
    expect(selectPrimaryMthdsSource([])).toBeUndefined();
  });

  describe("with a preferred file (the one an editor has open)", () => {
    it("keeps the preferred file when it declares main_pipe, even over bundle.mthds", () => {
      const opened = source("variant.mthds", WITH_MAIN);
      const sources = [source("bundle.mthds", WITH_MAIN), opened];
      expect(selectPrimaryMthdsSource(sources, opened)).toBe(opened);
    });

    it("moves to the method's entry point when the preferred file declares none", () => {
      const opened = source("concepts.mthds", WITHOUT_MAIN);
      const sources = [opened, source("bundle.mthds", WITH_MAIN)];
      expect(selectPrimaryMthdsSource(sources, opened)?.name).toBe("bundle.mthds");
    });

    it("stays on the preferred file when no file declares main_pipe", () => {
      const opened = source("two.mthds", WITHOUT_MAIN);
      const sources = [source("one.mthds", WITHOUT_MAIN), opened];
      expect(selectPrimaryMthdsSource(sources, opened)).toBe(opened);
    });

    it("reads the listed entry, not the preferred copy, and returns the listed entry", () => {
      // An editor's unsaved buffer may already declare main_pipe while the
      // listed file, which is what the merge reads, does not yet.
      const sources = [source("bundle.mthds", WITH_MAIN), source("variant.mthds", WITHOUT_MAIN)];
      const unsavedCopy = source("variant.mthds", WITH_MAIN);
      expect(selectPrimaryMthdsSource(sources, unsavedCopy)).toBe(sources[0]);
      const listedWithMain = [
        source("bundle.mthds", WITH_MAIN),
        source("variant.mthds", WITH_MAIN),
      ];
      const staleCopy = source("variant.mthds", WITHOUT_MAIN);
      expect(selectPrimaryMthdsSource(listedWithMain, staleCopy)).toBe(listedWithMain[1]);
    });

    it("ignores a preferred file that is not in the list", () => {
      const outsider = source("elsewhere.mthds", WITH_MAIN);
      const sources = [source("one.mthds", WITHOUT_MAIN), source("bundle.mthds", WITH_MAIN)];
      expect(selectPrimaryMthdsSource(sources, outsider)).toBe(sources[1]);
      const noMain = [source("one.mthds", WITHOUT_MAIN), source("two.mthds", WITHOUT_MAIN)];
      expect(selectPrimaryMthdsSource(noMain, source("x.mthds", WITHOUT_MAIN))).toBe(noMain[0]);
      expect(selectPrimaryMthdsSource([], outsider)).toBeUndefined();
    });
  });
});

describe("selectPrimaryMthdsSource and orderMthdsSources agree", () => {
  it.each([
    [
      "an unsaved copy that gained main_pipe",
      [source("bundle.mthds", WITH_MAIN), source("variant.mthds", WITHOUT_MAIN)],
      source("variant.mthds", WITH_MAIN),
    ],
    [
      "a stale copy that lost main_pipe",
      [source("bundle.mthds", WITH_MAIN), source("variant.mthds", WITH_MAIN)],
      source("variant.mthds", WITHOUT_MAIN),
    ],
    [
      "a name in another path form",
      [source("method/variant.mthds", WITH_MAIN), source("method/bundle.mthds", WITH_MAIN)],
      source("variant.mthds", WITH_MAIN),
    ],
    [
      "a preferred file that is not listed",
      [source("one.mthds", WITHOUT_MAIN), source("two.mthds", WITHOUT_MAIN)],
      source("x.mthds", WITHOUT_MAIN),
    ],
  ])("on %s", (_case, sources, preferred) => {
    expect(selectPrimaryMthdsSource(sources, preferred)).toBe(
      orderMthdsSources(sources, preferred)[0],
    );
  });
});

describe("orderMthdsSources", () => {
  it("moves the primary first and keeps the rest in the given order", () => {
    const sources = [
      source("c.mthds", WITHOUT_MAIN),
      source("a.mthds", WITHOUT_MAIN),
      source("bundle.mthds", WITH_MAIN),
      source("b.mthds", WITHOUT_MAIN),
    ];
    expect(names(orderMthdsSources(sources))).toEqual([
      "bundle.mthds",
      "c.mthds",
      "a.mthds",
      "b.mthds",
    ]);
  });

  it("returns a new array and leaves the input untouched", () => {
    const sources = [source("helpers.mthds", WITHOUT_MAIN), source("entry.mthds", WITH_MAIN)];
    const ordered = orderMthdsSources(sources);
    expect(ordered).not.toBe(sources);
    expect(names(sources)).toEqual(["helpers.mthds", "entry.mthds"]);
    const alreadyFirst = orderMthdsSources(ordered);
    expect(alreadyFirst).not.toBe(ordered);
    expect(alreadyFirst).toEqual(ordered);
  });

  it("keeps the given order when no file declares main_pipe", () => {
    const sources = [source("one.mthds", WITHOUT_MAIN), source("two.mthds", WITHOUT_MAIN)];
    expect(names(orderMthdsSources(sources))).toEqual(["one.mthds", "two.mthds"]);
  });

  it("leads with a preferred file matched by name, not by identity", () => {
    // An editor host builds its own object for the open file; a copy with the
    // listed name must lead exactly as the listed entry would.
    const sources = [
      source("helper.mthds", WITHOUT_MAIN),
      source("bundle.mthds", WITH_MAIN),
      source("variant.mthds", WITH_MAIN),
    ];
    const openedCopy = source("variant.mthds", WITH_MAIN);
    const ordered = orderMthdsSources(sources, openedCopy);
    expect(names(ordered)).toEqual(["variant.mthds", "helper.mthds", "bundle.mthds"]);
    expect(ordered[0]).toBe(sources[2]);
  });

  it("orders as if none were given when the preferred file is not in the list", () => {
    const outsider = source("elsewhere.mthds", WITH_MAIN);
    const sources = [source("one.mthds", WITHOUT_MAIN), source("bundle.mthds", WITH_MAIN)];
    expect(names(orderMthdsSources(sources, outsider))).toEqual(["bundle.mthds", "one.mthds"]);
  });

  it("returns an empty array for an empty list", () => {
    expect(orderMthdsSources([])).toEqual([]);
  });

  it("carries the host's own fields through", () => {
    const sources = [
      { name: "helpers.mthds", content: WITHOUT_MAIN, uri: "file:///m/helpers.mthds" },
      { name: "bundle.mthds", content: WITH_MAIN, uri: "file:///m/bundle.mthds" },
    ];
    expect(orderMthdsSources(sources)[0].uri).toBe("file:///m/bundle.mthds");
  });

  it("carries the host's own fields through a preferred file built without them", () => {
    // The open file is a plain MthdsSource; were `preferred` typed as the list's
    // element type, it would infer that as `T` and `.uri` would not type-check.
    const sources = [
      { name: "bundle.mthds", content: WITH_MAIN, uri: "file:///m/bundle.mthds" },
      { name: "variant.mthds", content: WITH_MAIN, uri: "file:///m/variant.mthds" },
    ];
    const opened = source("variant.mthds", WITH_MAIN);
    expect(orderMthdsSources(sources, opened)[0].uri).toBe("file:///m/variant.mthds");
    expect(selectPrimaryMthdsSource(sources, opened)?.uri).toBe("file:///m/variant.mthds");
  });
});
