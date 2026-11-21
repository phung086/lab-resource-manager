export function operatorNotificationDestination(notice, role) {
  if (!['ADMIN', 'LAB_STAFF'].includes(role)) return null;
  const incident = notice.messageParams?.incidentId;
  if (notice.titleKey === 'incident.urgent.title' && typeof incident === 'string') {
    return { tab: 'incidents', params: { incident }, labelKey: 'notification.urgent.openIncident' };
  }
  if (!['support.requested.title', 'support.assigned.title'].includes(notice.titleKey)) return null;
  const session = notice.messageParams?.sessionId;
  const canOpenSession = role === 'ADMIN' || notice.titleKey === 'support.assigned.title';
  return {
    tab: 'support',
    params: canOpenSession && typeof session === 'string' ? { session } : {},
    labelKey: 'support.openInbox'
  };
}
