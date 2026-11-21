import "dotenv/config";
import { emailConfiguration, verifyEmailTransport } from "../src/services/emailService.js";
import { emailApplicationUrl } from "../src/services/emailAutomationService.js";
import { prisma } from "../src/db.js";

// Read-only by default. Never echo credentials or customer email contents.
const c = emailConfiguration();
const report = {
  automationEnabled: process.env.EMAIL_AUTOMATION_ENABLED !== "false",
  transport: c.provider,
  transportConfigured: c.configured,
  fields: Object.fromEntries((c.provider === "google_script"
    ? ["GOOGLE_SCRIPT_MAIL_URL", "GOOGLE_SCRIPT_MAIL_TOKEN", "EMAIL_FROM"]
    : ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]
  ).map(key => [key, Boolean(process.env[key])])),
  applicationUrlValid: Boolean(emailApplicationUrl()),
  transportVerified: false,
  deliveryMeaning: "SENT records acceptance by the configured mail transport. Inbox delivery needs separate verification."
};
try {
  if (process.argv.includes("--verify")) {
    const result = await verifyEmailTransport();
    report.transportVerified = result.success;
    if (!result.success) report.verificationError = result.error;
  }
  if (process.argv.includes("--queue")) {
    report.queue = await prisma.emailDelivery.groupBy({ by: ["status", "lastError"], _count: { _all: true } });
    report.failed = await prisma.emailDelivery.findMany({ where: { status: "FAILED" }, take: 20,
      orderBy: { createdAt: "asc" }, select: { id: true, kind: true, attempts: true, lastError: true, createdAt: true } });
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.transportConfigured || !report.applicationUrlValid ||
      (process.argv.includes("--verify") && !report.transportVerified)) process.exitCode = 1;
} catch {
  console.error("Email configuration check failed: database unavailable or email migration not deployed.");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
