import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { startReminderScheduler } from "./services/notificationService.js";
import { startEmailDeliveryScheduler } from "./services/emailAutomationService.js";
import { startResourceOperationScheduler } from "./services/resourceOperationScheduler.js";
import { startPaymentHoldScheduler } from './services/bookingPaymentHoldService.js';
import { bridgeEvents, bridgeSettings } from './chatgptBridge/runtime.js';
import { startBridgeScheduler } from './chatgptBridge/events.js';
import { startAuthSessionCleanup } from './services/authSessionCleanup.js';
import { startWaitlistScheduler } from './services/planning/waitlistService.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Lab Resource Manager API is running on http://localhost:${config.port}`);
});

const stopReminderScheduler = startReminderScheduler({ client: prisma });
const stopEmailDeliveryScheduler = startEmailDeliveryScheduler({ client: prisma });
const stopResourceOperations = startResourceOperationScheduler(prisma);
const stopPaymentHolds = startPaymentHoldScheduler(prisma);
const stopBridge = startBridgeScheduler({ events: bridgeEvents, enabled: bridgeSettings.enabled });
const stopSessionCleanup = startAuthSessionCleanup(prisma);
const stopWaitlist = startWaitlistScheduler();

async function shutdown(signal) {
  console.log(`${signal} received, shutting down API.`);
  stopReminderScheduler();
  const emailDrain = stopEmailDeliveryScheduler();
  const operationDrain = stopResourceOperations();
  const paymentHoldDrain = stopPaymentHolds();
  const bridgeDrain = stopBridge();
  const sessionDrain = stopSessionCleanup();
  const waitlistDrain = stopWaitlist();
  server.close(async () => {
    await emailDrain;
    await operationDrain;
    await paymentHoldDrain;
    await bridgeDrain;
    await sessionDrain;
    await waitlistDrain;
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGUSR2", () => shutdown("SIGUSR2"));
