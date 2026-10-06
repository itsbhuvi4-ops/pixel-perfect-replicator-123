import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { preloaderPhase } from "./preloader-timeline";

describe("reference opening handoff", () => {
  test("starts cycling immediately and resolves before the website handoff", () => {
    assert.equal(preloaderPhase(0), "cycling");
    assert.equal(preloaderPhase(17.8), "hold");
    assert.equal(preloaderPhase(20), "hold");
    assert.equal(preloaderPhase(20.3), "fade");
    assert.equal(preloaderPhase(21.1), "done");
  });
  test("reduced motion shows the wordmark briefly without cycling", () => {
    assert.equal(preloaderPhase(0, true), "hold");
    assert.equal(preloaderPhase(1.25, true), "done");
  });
});