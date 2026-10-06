import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationsReport } from "../src/services/operationsReportService.js";

test("report service rejects ordinary roles and unsupported windows before database access", async () => {
  const client = { $queryRaw: () => assert.fail("No query should run") };
  for (const role of ["LECTURER", "STUDENT", "STAFF"]) {
    await assert.rejects(buildOperationsReport(client, { role }), error => error.code === "FORBIDDEN");
  }
  for (const days of [0, 1, 31, "7"]) {
    await assert.rejects(buildOperationsReport(client, { role: "ADMIN" }, { days }), error => error.code === "VALIDATION_ERROR");
  }
});

test("a database failure remains a failure instead of an empty or synthetic report", async () => {
  const failure = new Error("Isolated database failure");
  await assert.rejects(buildOperationsReport({ $queryRaw: async () => { throw failure; } }, { role: "ADMIN" }), error => error === failure);
});
