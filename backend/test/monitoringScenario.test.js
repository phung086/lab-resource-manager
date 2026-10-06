import assert from "node:assert/strict";
import test from "node:test";
import { buildMonitoringScenario } from "../scripts/lib/monitoringScenario.mjs";

test("isolated scenario covers usage, thermal alert, disconnect and recovery with existing rules", () => {
  const scenario = buildMonitoringScenario({ now: new Date("2026-10-05T09:00:00Z") });
  assert.equal(scenario.provenance, "SIMULATION_PREVIEW");
  assert.deepEqual(scenario.frames.map(frame => frame.monitoring.state), ["HEALTHY", "HEALTHY", "WARNING", "UNAVAILABLE", "HEALTHY", "HEALTHY"]);
  assert.equal(scenario.frames[2].previewConditions[0].ruleCode, "TEMPERATURE_CRITICAL");
  assert.equal(scenario.frames[3].previewConditions[0].ruleCode, "SOURCE_OFFLINE");
  assert.deepEqual(scenario.frames[4].previewConditions, []);
  assert.equal(scenario.frames.at(-1).simulatedElapsedUsageSeconds, 20);
  assert.equal(scenario.inputOperationalStatus, "AVAILABLE");
  assert.ok(scenario.frames.every(frame => frame.provenance === "SIMULATION_PREVIEW" && frame.sample.verifiedSignals.length === 0));
  assert.equal(JSON.stringify(scenario), JSON.stringify(buildMonitoringScenario({ now: new Date("2026-10-05T09:00:00Z") })));
});

test("scenario refuses invalid clocks and unbounded polling intervals", () => {
  for (const intervalSeconds of [0, 2, 11, 3.5, NaN]) assert.throws(() => buildMonitoringScenario({ intervalSeconds }));
  assert.throws(() => buildMonitoringScenario({ now: new Date("bad") }));
});
