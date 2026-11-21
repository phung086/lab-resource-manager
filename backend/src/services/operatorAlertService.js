import { randomUUID } from 'node:crypto';
import { ADMIN, LAB_STAFF } from '../constants/roles.js';
import { incidentNoticeKey, urgentIncidentSeverities } from '../constants/operatorAlerts.js';
import { enqueueOperatorAlertEmails } from './emailAutomationService.js';

export function operatorAlertRecipients(tx, laboratoryId) {
  return tx.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { role: ADMIN },
        ...(laboratoryId ? [{ role: LAB_STAFF, labAssignments: { some: { laboratoryId } } }] : [])
      ]
    },
    select: { id: true, role: true, email: true }
  });
}

export async function publishUrgentIncident(tx, incident, laboratoryId, now = new Date()) {
  if (!urgentIncidentSeverities.includes(incident.severity)) return;
  const recipients = await operatorAlertRecipients(tx, laboratoryId);
  await tx.notification.createMany({
    skipDuplicates: true,
    data: recipients.map(({ id: userId }) => ({
      id: randomUUID(),
      userId,
      dedupeKey: `incident:${incident.id}:urgent:${userId}`,
      title: 'Sự cố cần xử lý',
      message: 'Mở hồ sơ sự cố để xem và xử lý.',
      titleKey: incidentNoticeKey,
      messageKey: 'incident.urgent.message',
      messageParams: { incidentId: incident.id },
      severity: 'danger',
      sentAt: now
    }))
  });
  await enqueueOperatorAlertEmails(tx, recipients, { kind: 'incident', id: incident.id, laboratoryId });
}
