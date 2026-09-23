import assert from "node:assert/strict";

export function validateLocalDemoEnvironment(env) {
  assert.equal(env.DEMO_MODE, "true", "DEMO_MODE=true is required for local demo initialization");
  const url = new URL(env.DATABASE_URL || "");
  assert.ok(["postgresql:", "postgres:"].includes(url.protocol), "Only PostgreSQL is supported");
  assert.ok(["localhost", "127.0.0.1", "postgres"].includes(url.hostname), "Local demo refuses remote database hosts");
  const database = decodeURIComponent(url.pathname.slice(1));
  assert.equal(database, "lab_resources_local_demo", "Local demo only accepts lab_resources_local_demo; other databases are untouched");
  assert.ok(!url.searchParams.has("schema") || url.searchParams.get("schema") === "public", "Local demo only accepts the public schema");
  return database;
}
