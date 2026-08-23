import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Lab Resource Manager API is running on http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down API.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
