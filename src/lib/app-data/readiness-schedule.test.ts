import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  READINESS_PROBE_DELAYS_MS,
  READINESS_PROBE_MAX_TOTAL_MS,
  readinessProbeDelayMs,
  readinessProbeExhausted,
} from "./readiness-schedule.ts";

describe("readinessProbeDelayMs", () => {
  it("backs off through the schedule and then holds the last delay", () => {
    const last = READINESS_PROBE_DELAYS_MS[READINESS_PROBE_DELAYS_MS.length - 1];
    assert.deepEqual(
      [0, 1, 2, 3, 4, 50].map(readinessProbeDelayMs),
      [...READINESS_PROBE_DELAYS_MS, last, last],
    );
  });

  it("clamps a negative attempt to the first delay", () => {
    assert.equal(readinessProbeDelayMs(-3), READINESS_PROBE_DELAYS_MS[0]);
  });
});

describe("readinessProbeExhausted", () => {
  it("gives up only once the total wait budget has elapsed", () => {
    assert.equal(readinessProbeExhausted(1_000, 1_000), false);
    assert.equal(
      readinessProbeExhausted(1_000, 1_000 + READINESS_PROBE_MAX_TOTAL_MS - 1),
      false,
    );
    assert.equal(
      readinessProbeExhausted(1_000, 1_000 + READINESS_PROBE_MAX_TOTAL_MS),
      true,
    );
  });
});
