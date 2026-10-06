import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const mainComparison = process.argv.includes("--main");
const source = mainComparison ? path.resolve(root, "../lab-resource-manager-main") : root;
const frontend = path.join(source, "frontend");
const uiPort = mainComparison ? "5180" : "5173";
const apiPort = "8000";
const project = "lrm-local-review";
const environment = { ...process.env };
const compose = ["compose", "-f", "docker-compose.local.yml"];
let activeChild;
let interrupted = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: environment, stdio: "inherit", windowsHide: true, ...options });
    activeChild = child;
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      if (interrupted || code === 0) resolve();
      else reject(new Error(`${command} exited (${code ?? signal}).`));
    });
  });
}

async function checkFrontendPort() {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Cong ${uiPort} dang duoc dung. Dung terminal frontend cu (Ctrl+C), roi chay lai.`)));
    server.listen(Number(uiPort), "127.0.0.1", () => server.close(resolve));
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    activeChild?.kill(signal);
  });
}

try {
  if (process.argv.includes("--stop")) {
    await run("docker", [...compose, "stop"]);
    console.log("Da dung backend/database local. Du lieu duoc giu nguyen.");
  } else if (process.argv.includes("--backend")) {
    await run("docker", [...compose, "up", "-d", ...(process.argv.includes("--rebuild") ? ["--build"] : ["--no-build"]), "--wait", "--wait-timeout", "180", "backend"]);
    console.log("Shared backend ready: http://localhost:8000/health/ready");
  } else {
    if (process.argv.includes("--rebuild")) throw new Error("De build backend, chay npm run dev:backend:rebuild tai frontend cua nhanh.");
    if (!existsSync(path.join(source, "backend/package.json"))) throw new Error(`Khong tim thay checkout: ${source}. Xem README de tao worktree main.`);
    await checkFrontendPort();
    try {
      const health = await fetch('http://localhost:8000/health/ready', { signal: AbortSignal.timeout(5000) });
      if (!health.ok) throw new Error('Backend not ready');
    } catch {
      throw new Error('Backend chua san sang. Bat Docker Desktop, chay npm run dev:backend trong frontend cua nhanh; hoac bat nhom lrm-local-review trong Docker Desktop.');
    }
    if (!interrupted) {
      if (!existsSync(path.join(frontend, "node_modules/vite/bin/vite.js"))) {
        if (!process.env.npm_execpath) throw new Error(`Chay npm ci trong ${frontend}, sau do thu lai.`);
        await run(process.execPath, [process.env.npm_execpath, "ci"], { cwd: frontend });
      }
    }
    if (!interrupted) {
      console.log(`Source: ${source}`);
      await run("git", ["-C", source, "log", "-1", "--format=Checkout: %h %s"]);
    }
    if (!interrupted) {
      console.log(`Backend san sang: http://localhost:${apiPort}/health/ready`);
      console.log(`Frontend: http://localhost:${uiPort} | Docker project: ${project}`);
      console.log("Tai khoan local: admin/staff/lecturer/student@lrm.local. Mat khau: LabDemo!2026Pass");
      console.log("Ctrl+C chi dung frontend. Backend va database dung chung cho ca hai giao dien.");
      await run(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", uiPort, "--strictPort", ...process.argv.slice(2).filter(arg => !["--main", "--rebuild", "--backend"].includes(arg))], {
        cwd: frontend,
        env: { ...process.env, VITE_API_BASE_URL: `http://localhost:${apiPort}/api`, VITE_ENABLE_RESEARCH_FEATURES: "false", VITE_ENABLE_PAYMENT_FEATURES: "false", VITE_ENABLE_AI_ASSISTANT: "true" }
      });
    }
  }
} catch (error) {
  if (!interrupted) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
