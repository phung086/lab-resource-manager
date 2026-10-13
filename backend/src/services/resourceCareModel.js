// Operational accounting for explicitly configured virtual resources. No sensor inference.
export function operationTotals(segments, now = new Date(), since = new Date(0)) {
  let seconds = 0, loadedSeconds = 0;
  for (const segment of segments) {
    const start = Math.max(+new Date(segment.startedAt), +since);
    const end = Math.min(+new Date(segment.endedAt || now), +now);
    const duration = Math.max(0, (end - start) / 1000);
    seconds += duration;
    loadedSeconds += duration * segment.loadPercent / 100;
  }
  return { hours: seconds / 3600, equivalentLoadHours: loadedSeconds / 3600 };
}

export function bookingCareUsage(bookings, now = new Date(), since = new Date(0)) {
  let hours = 0, uses = 0;
  for (const booking of bookings) {
    if (!booking.actualStartAt) continue;
    const started = +new Date(booking.actualStartAt);
    if (booking.actualEndAt && started >= +since && +new Date(booking.actualEndAt) <= +now) uses += 1;
    const ended = +new Date(booking.actualEndAt || now);
    hours += Math.max(0, Math.min(ended, +now) - Math.max(started, +since)) / 3600000;
  }
  return { hours, uses };
}

export function careStatus(profile, hoursSinceService, now = new Date(), uses = 0) {
  if (!profile) return { configured: false, due: false, nearDue: false, progressPercent: 0, dueAt: null, remainingHours: null, remainingUses: null };
  const dueAt = profile.intervalDays ? new Date(+new Date(profile.servicedAt) + profile.intervalDays * 86400000) : null;
  const remainingHours = profile.intervalHours == null ? null : profile.intervalHours - hoursSinceService;
  const remainingUses = profile.intervalUses == null ? null : profile.intervalUses - uses;
  const progressPercent = Math.max(0, ...(profile.intervalDays ? [(+now - +new Date(profile.servicedAt)) / (profile.intervalDays * 86400000) * 100] : []), ...(profile.intervalHours ? [hoursSinceService / profile.intervalHours * 100] : []), ...(profile.intervalUses ? [uses / profile.intervalUses * 100] : []));
  const due = progressPercent >= 100;
  return { configured: true, due, nearDue: !due && progressPercent >= (profile.warningPercent ?? 80), progressPercent, dueAt, remainingHours, remainingUses };
}
