import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLocalDemoEnvironment } from "../scripts/localDemoGuard.mjs";

test("local demo guard only permits explicit local demo database", () => {
  for (const host of ["localhost", "127.0.0.1", "postgres"]) {
    assert.equal(validateLocalDemoEnvironment({ DEMO_MODE: "true", DATABASE_URL: `postgresql://user:pass@${host}/lab_resources_local_demo` }), "lab_resources_local_demo");
  }
  for (const env of [
    { DEMO_MODE: "false", DATABASE_URL: "postgresql://localhost/lab_resources_local_demo" },
    { DEMO_MODE: "true", DATABASE_URL: "postgresql://remote.example/lab_resources_local_demo" },
    { DEMO_MODE: "true", DATABASE_URL: "postgresql://localhost/lab_resources" },
    { DEMO_MODE: "true", DATABASE_URL: "postgresql://localhost/another_demo" },
    { DEMO_MODE: "true", DATABASE_URL: "postgresql://localhost/lab_resources_local_demo?schema=production" },
    { DEMO_MODE: "true", DATABASE_URL: "https://localhost/lab_resources_local_demo" },
  ]) assert.throws(() => validateLocalDemoEnvironment(env));
});
