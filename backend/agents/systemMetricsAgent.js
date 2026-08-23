import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const apiBaseUrl = process.env.LRM_API_BASE_URL || "http://localhost:8000";
const telemetryApiKey = process.env.LRM_TELEMETRY_API_KEY || "";
const resourceCode = process.env.LRM_RESOURCE_CODE || os.hostname();
const intervalMs = Number(process.env.LRM_AGENT_INTERVAL_MS || 30000);

if (!telemetryApiKey) {
  throw new Error("LRM_TELEMETRY_API_KEY is required.");
}

function cpuSnapshot() {
  const cpus = os.cpus();
  const totals = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return { idle: cpu.times.idle, total };
  });
  return totals;
}

function cpuPercent(previous, next) {
  const values = next.map((current, index) => {
    const prior = previous[index] || current;
    const idle = current.idle - prior.idle;
    const total = current.total - prior.total;
    return total > 0 ? 100 - (idle / total) * 100 : 0;
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function getGpuMetrics() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
      "--format=csv,noheader,nounits"
    ]);
    const rows = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(",").map((item) => Number(item.trim())))
      .filter((items) => items.length === 4 && items.every((item) => Number.isFinite(item)));

    if (!rows.length) return {};
    const averages = rows.reduce(
      (sum, [gpu, memoryUsed, memoryTotal, temperature]) => ({
        gpuPercent: sum.gpuPercent + gpu,
        gpuMemoryPercent: sum.gpuMemoryPercent + (memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0),
        temperatureC: sum.temperatureC + temperature
      }),
      { gpuPercent: 0, gpuMemoryPercent: 0, temperatureC: 0 }
    );
    return {
      gpuPercent: averages.gpuPercent / rows.length,
      gpuMemoryPercent: averages.gpuMemoryPercent / rows.length,
      temperatureC: averages.temperatureC / rows.length
    };
  } catch (_error) {
    return {};
  }
}

async function collectSample(previousCpu) {
  const currentCpu = cpuSnapshot();
  const ramPercent = 100 - (os.freemem() / os.totalmem()) * 100;
  const gpu = await getGpuMetrics();
  return {
    resourceCode,
    cpuPercent: cpuPercent(previousCpu, currentCpu),
    ramPercent,
    online: true,
    source: `system-agent:${os.hostname()}`,
    ...gpu,
    _cpuSnapshot: currentCpu
  };
}

async function sendSample(sample) {
  const { _cpuSnapshot, ...payload } = sample;
  const response = await fetch(`${apiBaseUrl}/telemetry/samples`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telemetry-key": telemetryApiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telemetry push failed (${response.status}): ${text}`);
  }
  return _cpuSnapshot;
}

let previousCpu = cpuSnapshot();

async function tick() {
  try {
    const sample = await collectSample(previousCpu);
    previousCpu = await sendSample(sample);
    console.log(`[${new Date().toISOString()}] telemetry sent for ${resourceCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${error.message}`);
  }
}

await tick();
setInterval(tick, intervalMs);
