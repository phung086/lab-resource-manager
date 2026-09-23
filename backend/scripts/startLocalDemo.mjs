import "dotenv/config";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateLocalDemoEnvironment } from "./localDemoGuard.mjs";

validateLocalDemoEnvironment(process.env);
if (process.env.NODE_ENV === "production") throw new Error("The local demo launcher cannot run in production");
const backend = fileURLToPath(new URL("../", import.meta.url));
const frontend = fileURLToPath(new URL("../../frontend/", import.meta.url));
const apiPort = process.env.LOCAL_DEMO_API_PORT || "15004";
const uiPort = process.env.LOCAL_DEMO_UI_PORT || "15179";
for (const port of [apiPort, uiPort]) if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error("Local demo ports must be integers between 1024 and 65535");
if (apiPort === uiPort) throw new Error("API and frontend require different ports");
// Payment demonstrations require an explicit opt-in on both API and UI.
const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true" && process.env.VITE_ENABLE_PAYMENT_FEATURES === "true";
const env = { ...process.env, NODE_ENV: "development", PORT: apiPort, LOG_FORMAT: "dev", JWT_SECRET: randomBytes(32).toString("hex"), CORS_ORIGINS: `http://127.0.0.1:${uiPort}`, REMINDER_SCHEDULER_ENABLED: "false", PAYMENTS_ENABLED: String(paymentsEnabled), MCP_ASSISTANT_ENABLED: "true", VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}/api`, VITE_ENABLE_PAYMENT_FEATURES: String(paymentsEnabled), VITE_ENABLE_AI_ASSISTANT: "true", VITE_ENABLE_RESEARCH_FEATURES: "false" };
function run(args, cwd) {
  return spawn(process.execPath, args, { cwd, env, stdio: "inherit", windowsHide: true });
}
async function once(args) {
  const child = run(args, backend);
  await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Demo setup exited with code ${code}`))); });
}
await once(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
await once(["scripts/seedLocalDemo.mjs"]);
const children = [run(["src/server.js"], backend), run(["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", uiPort, "--strictPort"], frontend)];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(child => child.kill()); process.exitCode = code; }
children.forEach(child => { child.on("error", error => { console.error(error.message); stop(1); }); child.on("exit", code => stop(code || 0)); });
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
console.log(`Local demo: http://127.0.0.1:${uiPort} — Ctrl+C stops both servers. Optional payment integration: ${paymentsEnabled ? "enabled (provider configuration required)" : "OFF"}. No payment success is simulated.`);
