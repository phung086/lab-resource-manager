import { prisma } from "../db.js";

export async function notify(userId, titleKey, messageKey, severity = "info", messageParams = {}) {
  return prisma.notification.create({
    data: {
      userId,
      title: titleKey,
      message: messageKey,
      titleKey,
      messageKey,
      messageParams,
      severity
    }
  });
}

export async function notifyAdminsAndStaff(titleKey, messageKey, severity = "info", messageParams = {}) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["admin", "lab_staff"] }, isActive: true },
    select: { id: true }
  });
  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      title: titleKey,
      message: messageKey,
      titleKey,
      messageKey,
      messageParams,
      severity
    }))
  });
}
