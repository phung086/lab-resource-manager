import { setTimeout as delay } from "node:timers/promises";
import { buildMonitoringScenario } from "./lib/monitoringScenario.mjs";

const args = process.argv.slice(2);
if (args.some(arg => arg !== "--play") || args.length > 1) {
  throw new Error("Usage: npm run demo:monitoring-scenario -- [--play]");
}
const scenario = buildMonitoringScenario();
if (!args.includes("--play")) console.log(JSON.stringify(scenario, null, 2));
else {
  console.log(JSON.stringify({ provenance: scenario.provenance, disclaimer: scenario.disclaimer, thresholds: scenario.thresholds }));
  for (const [index, frame] of scenario.frames.entries()) {
    if (index) await delay(scenario.intervalSeconds * 1000);
    console.log(JSON.stringify(frame));
  }
}
