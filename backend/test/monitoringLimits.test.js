import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createMonitoringBudget } from "../src/middleware/monitoringLimits.js";
import { errorHandler } from "../src/middleware/errors.js";

test("verified monitoring identities share a bounded budget across reads and controls without charging other identities", async () => {
  const app = express();
  // Isolated middleware fixture; live routes establish req.user through JWT/RBAC.
  app.use((req,_res,next) => { req.user = { id: req.get("x-test-principal") }; next(); });
  const budget = createMonitoringBudget(req => req.user.id, 3);
  app.get("/telemetry",budget,(_req,res) => res.json({}));
  app.post("/runs",budget,(_req,res) => res.json({}));
  app.use(errorHandler);
  const get = id => request(app).get("/telemetry").set("x-test-principal",id);
  assert.equal((await get("operator-a")).status,200);
  assert.equal((await request(app).post("/runs").set("x-test-principal","operator-a")).status,200);
  assert.equal((await get("operator-a")).status,200);
  assert.equal((await get("operator-a")).status,429);
  assert.equal((await get("operator-b")).status,200);
});

test("sample delivery and supervisor heartbeats share the authenticated source budget", async () => {
  const app = express();
  app.use((req,_res,next) => { req.telemetrySource = { id: req.get("x-test-source") }; next(); });
  const budget = createMonitoringBudget(req => req.telemetrySource.id, 2);
  app.post(["/samples","/agent"],budget,(_req,res) => res.json({})); app.use(errorHandler);
  assert.equal((await request(app).post("/samples").set("x-test-source","source-a")).status,200);
  assert.equal((await request(app).post("/agent").set("x-test-source","source-a")).status,200);
  const limited = await request(app).post("/samples").set("x-test-source","source-a");
  assert.equal(limited.status,429); assert.equal(limited.body.error.code,"RATE_LIMITED");
  assert.equal((await request(app).post("/samples").set("x-test-source","source-b")).status,200);
});
