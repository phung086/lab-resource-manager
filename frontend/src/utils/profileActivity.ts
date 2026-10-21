type BookingSummary = { total: number; active: number; completed: number; byStatus: Record<string, number> };
const statusOrder = ['PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_OUT', 'RETURNED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

// Keep server totals authoritative; an incomplete snapshot must not become a zero chart.
export function buildProfileActivity(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const summary = value as BookingSummary;
  if (![summary.total, summary.active, summary.completed].every(isCount)
    || summary.active + summary.completed > summary.total
    || !summary.byStatus || typeof summary.byStatus !== 'object' || Array.isArray(summary.byStatus)) return null;
  const entries = Object.entries(summary.byStatus);
  if (entries.some(([, count]) => !isCount(count)) || entries.reduce((sum, [, count]) => sum + count, 0) !== summary.total) return null;
  if (summary.completed !== (summary.byStatus.COMPLETED || 0)
    || summary.active !== ['PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_OUT', 'RETURNED'].reduce((sum, status) => sum + (summary.byStatus[status] || 0), 0)) return null;
  const rank = (status: string) => statusOrder.includes(status) ? statusOrder.indexOf(status) : statusOrder.length;
  const rows = entries.filter(([, count]) => count > 0)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([status, count]) => ({ status, count, ratio: count / summary.total }));
  return { total: summary.total, active: summary.active, completed: summary.completed, rows };
}
