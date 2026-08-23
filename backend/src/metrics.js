import express from "express";
import client from "prom-client";

export const metricsRouter = express.Router();

client.collectDefaultMetrics({ prefix: "lab_resource_api_" });

const httpRequests = new client.Counter({
  name: "lab_resource_api_http_requests_total",
  help: "Total API requests",
  labelNames: ["method", "route", "status"]
});

export const bookingTransitions = new client.Counter({
  name: "lab_resource_booking_transitions_total",
  help: "Booking workflow transitions",
  labelNames: ["transition"]
});

export const telemetryGauges = {
  online: new client.Gauge({
    name: "lab_resource_online",
    help: "Resource online state where 1 is online and 0 is offline",
    labelNames: ["resource_code", "resource_type"]
  }),
  cpu: new client.Gauge({
    name: "lab_resource_cpu_percent",
    help: "Resource CPU utilization",
    labelNames: ["resource_code", "resource_type"]
  }),
  gpu: new client.Gauge({
    name: "lab_resource_gpu_percent",
    help: "Resource GPU utilization",
    labelNames: ["resource_code", "resource_type"]
  }),
  gpuMemory: new client.Gauge({
    name: "lab_resource_gpu_memory_percent",
    help: "Resource GPU memory utilization",
    labelNames: ["resource_code", "resource_type"]
  }),
  ram: new client.Gauge({
    name: "lab_resource_ram_percent",
    help: "Resource RAM utilization",
    labelNames: ["resource_code", "resource_type"]
  }),
  disk: new client.Gauge({
    name: "lab_resource_disk_percent",
    help: "Resource disk utilization",
    labelNames: ["resource_code", "resource_type"]
  }),
  temperature: new client.Gauge({
    name: "lab_resource_temperature_celsius",
    help: "Resource temperature in Celsius",
    labelNames: ["resource_code", "resource_type"]
  })
};

export function metricsMiddleware(req, res, next) {
  res.on("finish", () => {
    const route = req.route?.path || req.baseUrl || req.path;
    httpRequests.inc({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}

export function observeTelemetry(resource, sample) {
  const labels = { resource_code: resource.code, resource_type: resource.type };
  telemetryGauges.online.set(labels, sample.online ? 1 : 0);
  if (sample.cpuPercent !== null && sample.cpuPercent !== undefined) telemetryGauges.cpu.set(labels, sample.cpuPercent);
  if (sample.gpuPercent !== null && sample.gpuPercent !== undefined) telemetryGauges.gpu.set(labels, sample.gpuPercent);
  if (sample.gpuMemoryPercent !== null && sample.gpuMemoryPercent !== undefined) telemetryGauges.gpuMemory.set(labels, sample.gpuMemoryPercent);
  if (sample.ramPercent !== null && sample.ramPercent !== undefined) telemetryGauges.ram.set(labels, sample.ramPercent);
  if (sample.diskPercent !== null && sample.diskPercent !== undefined) telemetryGauges.disk.set(labels, sample.diskPercent);
  if (sample.temperatureC !== null && sample.temperatureC !== undefined) telemetryGauges.temperature.set(labels, sample.temperatureC);
}

metricsRouter.get("/", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
