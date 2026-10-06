import { describe, expect, test } from "bun:test";
import { preloaderPhase } from "./preloader-timeline";

describe("reference opening handoff", () => {
  test("starts cycling immediately and resolves before the website handoff", () => {
    expect(preloaderPhase(0)).toBe("cycling");
    expect(preloaderPhase(17.8)).toBe("hold");
    expect(preloaderPhase(20)).toBe("hold");
    expect(preloaderPhase(20.3)).toBe("fade");
    expect(preloaderPhase(21.1)).toBe("done");
  });
  test("reduced motion shows the wordmark briefly without cycling", () => {
    expect(preloaderPhase(0, true)).toBe("hold");
    expect(preloaderPhase(1.25, true)).toBe("done");
  });
});