import { describe, expect, it } from "vitest";
import { DEFAULT_SIMPLE_PROGRESS_STRINGS as strings } from "@timeline/react/styles/simple/simpleProgressStrings";

describe("the simple style's times", () => {
  it("count what is still going in whole seconds, since the clock moves once a second", () => {
    expect(strings.elapsed(400)).toBe("<1s");
    expect(strings.elapsed(3_240)).toBe("3s");
    expect(strings.elapsed(3_960)).toBe("3s");
    expect(strings.elapsed(65_400)).toBe("1m 05s");
  });

  it("give what ended to the tenth of a second below ten seconds", () => {
    expect(strings.duration(400)).toBe("<1s");
    expect(strings.duration(3_240)).toBe("3.2s");
    expect(strings.duration(42_000)).toBe("42s");
  });
});
