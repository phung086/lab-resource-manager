import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { metricsRouter } from "../src/metrics.js";
import { metricsAccess } from "../src/middleware/metricsAccess.js";
import { errorHandler } from "../src/middleware/errors.js";

const secret = "isolated-test-metrics-credential-2026";
function app(settings) {
  const server = express();
  server.use("/metrics", metricsAccess(settings), metricsRouter);
  server.use(errorHandler);
  return server;
}

test("production metrics fail closed when a dedicated credential is absent", async () => {
  const response = await request(app({ isProduction: true })).get("/metrics");
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, "METRICS_UNAVAILABLE");
  assert.doesNotMatch(response.text, /lab_resource_api_process/);
});

test("production Prometheus reads require the exact header credential; query tokens never authorize", async () => {
  const server = app({ isProduction: true, metricsToken: secret });
  for (const header of ["", "Basic bad", "Bearer wrong", `Bearer ${secret} extra`]) {
    const response = await request(server).get(`/metrics?token=${secret}`).set("Authorization", header);
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Bearer");
    assert.ok(!response.text.includes(secret));
  }
  const accepted = await request(server).get("/metrics").set("Authorization", `Bearer ${secret}`);
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers["content-type"], /text\/plain/);
  assert.match(accepted.text, /lab_resource_api_process/);
});

test("development keeps its local scrape contract and enforces an explicitly configured credential", async () => {
  assert.equal((await request(app({ isProduction: false })).get("/metrics")).status, 200);
  assert.equal((await request(app({ isProduction: false, metricsToken: secret })).get("/metrics")).status, 401);
});
