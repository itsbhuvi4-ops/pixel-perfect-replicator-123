import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { preloaderPhase } from "./preloader-timeline";

describe("reference opening handoff", () => {
  test("starts cycling immediately and resolves before the website handoff", () => {
    assert.equal(preloaderPhase(0), "cycling");
    assert.equal(preloaderPhase(5.6), "hold");
    assert.equal(preloaderPhase(6.4), "hold");
    assert.equal(preloaderPhase(6.5), "fade");
    assert.equal(preloaderPhase(6.999), "fade");
    assert.equal(preloaderPhase(7), "done");
  });
  test("reduced motion shows the wordmark briefly without cycling", () => {
    assert.equal(preloaderPhase(0, true), "hold");
    assert.equal(preloaderPhase(1.25, true), "done");
  });
});