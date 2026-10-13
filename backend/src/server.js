import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { startReminderScheduler } from "./services/notificationService.js";
import { startEmailDeliveryScheduler } from "./services/emailAutomationService.js";
import { startResourceOperationScheduler } from "./services/resourceOperationScheduler.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Lab Resource Manager API is running on http://localhost:${config.port}`);
});

const stopReminderScheduler = startReminderScheduler({ client: prisma });
const stopEmailDeliveryScheduler = startEmailDeliveryScheduler({ client: prisma });
const stopResourceOperations = startResourceOperationScheduler(prisma);

async function shutdown(signal) {
  console.log(`${signal} received, shutting down API.`);
  stopReminderScheduler();
  const emailDrain = stopEmailDeliveryScheduler();
  const operationDrain = stopResourceOperations();
  server.close(async () => {
    await emailDrain;
    await operationDrain;
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGUSR2", () => shutdown("SIGUSR2"));
