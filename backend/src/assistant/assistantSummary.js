const message = (key, params = {}, labels = {}, times = {}) => ({ key, params, ...(Object.keys(labels).length ? { labels } : {}), ...(Object.keys(times).length ? { times } : {}) });
const stateKey = (group, status) => `enum.${group}.${status}`;
export function buildAssistantSummary(results) {
  if (!results.length) return [message('assistant.guidance')];
  return results.flatMap(({ result: r }) => {
    if (r.error) return [message(`api.${r.error.code || 'DATA_UNAVAILABLE'}`)];
    if (typeof r.resources === 'number') return [message('assistant.operational', { resources: r.resources, unread: r.unreadNotifications }, { scope: `assistant.scope.${r.scope}` }), ...(r.bookings || []).map(b => message('assistant.bookingCount', { count: b.count }, { status: stateKey('booking', b.status) }))];
    if (r.slots) return r.searchTruncated ? [message('assistant.searchLimited'), ...r.slots.map(s => message('assistant.slotLine', { code: s.resourceCode }, {}, { start: s.startAt, end: s.endAt })), message('assistant.slotBoundary')] : r.slots.length ? [message('assistant.slotHeading'), ...r.slots.map(s => message('assistant.slotLine', { code: s.resourceCode }, {}, { start: s.startAt, end: s.endAt })), message('assistant.slotBoundary')] : [message('assistant.noSlots')];
    if (Array.isArray(r.resources)) return r.resources.length ? [message('assistant.resourceHeading'), ...r.resources.map(x => message('assistant.resourceLine', { code: x.code, name: x.name || '' }, { status: stateKey('operational', x.operationalStatus) }))] : [message('assistant.noResources')];
    if (r.bookings) return r.bookings.length ? [message('assistant.bookingsHeading'), ...r.bookings.map(b => b.startAt ? message('assistant.bookingLine', { title: b.title || '' }, { status: stateKey('booking', b.status) }, { time: b.startAt }) : message('assistant.bookingCount', { count: b.count }, { status: stateKey('booking', b.status) }))] : [message('assistant.noBookings')];
    if (r.notifications) return r.notifications.length ? [message('assistant.notificationsHeading'), ...r.notifications.map(n => message(n.titleKey ? `notification.${n.titleKey}` : n.messageParams?.event ? `notification.booking.event.${n.messageParams.event}.title` : 'notification.generic.title', n.messageParams || {}))] : [message('assistant.noNotifications')];
    if (r.incidents) return r.incidents.length ? r.incidents.map(n => message('assistant.incidentLine', { title: n.title }, { status: stateKey('incident', n.status.toLowerCase()) })) : [message('assistant.noIncidents')];
    if (r.sources) return r.sources.length ? r.sources.map(s => ({ text: `${s.document.title}${s.document.version ? ` (${s.document.version})` : ''}: ${s.excerpt}` })) : [message('assistant.noSources')];
    if ('available' in r) return [message(r.available ? 'assistant.available' : 'assistant.conflict')];
    if ('bookable' in r) return [message('assistant.eligibility', { training: r.missingTraining?.map(t => t.name).join(', ') || '' }, { bookable: r.bookable ? 'enum.boolean.true' : 'enum.boolean.false', approval: r.requiresApproval ? 'enum.boolean.true' : 'enum.boolean.false' })];
    return [message('assistant.guidance')];
  });
}
export function renderAssistantSummary(summary, translate, locale) {
  const formatTime = value => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  return summary.map(segment => segment.text ?? translate(segment.key, { ...segment.params, ...Object.fromEntries(Object.entries(segment.labels || {}).map(([key, id]) => [key, translate(id)])), ...Object.fromEntries(Object.entries(segment.times || {}).map(([key, value]) => [key, formatTime(value)])) })).join('\n');
}
