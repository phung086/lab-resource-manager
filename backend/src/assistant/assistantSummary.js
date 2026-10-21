const message = (key, params = {}, labels = {}, times = {}) => ({ key, params, ...(Object.keys(labels).length ? { labels } : {}), ...(Object.keys(times).length ? { times } : {}) });
const stateKey = (group, status) => `enum.${group}.${status}`;
export function buildAssistantSummary(results) {
  if (!results.length) return [message('assistant.guidance')];
  return results.flatMap(({ result: r }) => {
    if (r.error) return [message(`api.${r.error.code || 'DATA_UNAVAILABLE'}`)];
    if (r.deferred) return [message('assistant.hardwareDeferred')];
    if (r.kind === 'report') return [message('assistant.data.report', { days: r.window.days, resources: r.summary.resourceCount, bookings: r.summary.bookingCount,
      scheduled: r.summary.scheduledMinutes, actual: r.summary.actualUsageMinutes, incidents: r.summary.openIncidentCount }), message('assistant.data.reportBasis')];
    if (r.kind === 'stock') return [message('assistant.data.stock'), message('assistant.data.preview', { total: r.total, shown: r.items.length }),
      ...r.items.map(item => item.stockItem ? message('assistant.data.stockLine', { code: item.code, name: item.name, balance: item.stockItem.balance, unit: item.stockItem.unit }) : message('assistant.data.stockUnknown', { code: item.code, name: item.name }))];
    if (r.kind === 'customers') return [message('assistant.data.customers'), message('assistant.data.preview', { total: r.total, shown: r.items.length }),
      ...r.items.map(item => message('assistant.data.customerLine', { name: item.fullName || '—', email: item.email, phone: item.phone || '—' }, { status: item.isActive ? 'enum.boolean.true' : 'enum.boolean.false' }))];
    if (r.kind === 'schedule') return [message('assistant.data.schedule', {}, {}, { start: r.startAt, end: r.endAt }), message('assistant.data.preview', { total: r.total, shown: r.items.length }),
      ...r.counts.flatMap(item => item.status === 'PENDING_APPROVAL' && r.awaitingPayment ? [
        ...(item.count > r.awaitingPayment ? [message('assistant.bookingCount', { count: item.count - r.awaitingPayment }, { status: stateKey('booking', item.status) })] : []),
        message('assistant.bookingCount', { count: r.awaitingPayment }, { status: 'assistant.data.awaitingPayment' })
      ] : [message('assistant.bookingCount', { count: item.count }, { status: stateKey('booking', item.status) })]),
      ...r.items.map(item => message('assistant.data.scheduleLine', { code: item.bookingCode || item.id, resource: item.resource.name, customer: item.requestedBy?.fullName || '', title: item.title },
        { status: item.status === 'PENDING_APPROVAL' && item.paymentDueAt ? 'assistant.data.awaitingPayment' : stateKey('booking', item.status) }, { start: item.startAt, end: item.endAt }))];
    if (typeof r.resources === 'number') return [message('assistant.operational', { resources: r.resources, unread: r.unreadNotifications }, { scope: `assistant.scope.${r.scope}` }), ...(r.bookings || []).map(b => message('assistant.bookingCount', { count: b.count }, { status: stateKey('booking', b.status) }))];
    if (r.slots) return r.searchTruncated ? [message('assistant.searchLimited'), ...r.slots.map(s => message('assistant.slotLine', { code: s.resourceCode }, {}, { start: s.startAt, end: s.endAt })), message('assistant.slotBoundary')] : r.slots.length ? [message('assistant.slotHeading'), ...r.slots.map(s => message('assistant.slotLine', { code: s.resourceCode }, {}, { start: s.startAt, end: s.endAt })), message('assistant.slotBoundary')] : [message('assistant.noSlots')];
    if (Array.isArray(r.resources)) return r.resources.length ? [message('assistant.resourceHeading'), ...r.resources.map(x => message('assistant.resourceLine', { code: x.code, name: x.name || '' }, { status: stateKey('operational', x.operationalStatus) }))] : [message('assistant.noResources')];
    if (r.bookings) return r.bookings.length ? [message('assistant.bookingsHeading'), ...r.bookings.map(b => b.startAt ? message('assistant.bookingLine', { title: b.title || '' }, { status: stateKey('booking', b.status) }, { time: b.startAt }) : message('assistant.bookingCount', { count: b.count }, { status: stateKey('booking', b.status) }))] : [message('assistant.noBookings')];
    if (r.notifications) return r.notifications.length ? [message('assistant.notificationsHeading'), ...r.notifications.map(n => message(n.titleKey ? `notification.${n.titleKey}` : n.messageParams?.event ? `notification.booking.event.${n.messageParams.event}.title` : 'notification.generic.title', n.messageParams || {}))] : [message('assistant.noNotifications')];
    if (r.incidents) return r.incidents.length ? r.incidents.map(n => message('assistant.incidentLine', { title: n.title }, { status: stateKey('incident', n.status.toLowerCase()) })) : [message('assistant.noIncidents')];
    if (r.sources) return r.sources.length ? r.sources.map(s => ({ text: `${s.document.title}${s.document.version ? ` (${s.document.version})` : ''}: ${s.excerpt}` })) : [message('assistant.noSources')];
    if (r.resource) return [message('assistant.resourceLine', { code: r.resource.code, name: r.resource.name }, { status: stateKey('operational', r.resource.operationalStatus) }), message('assistant.resourceLocation', { location: r.resource.location || '' }), message('assistant.detailBoundary')];
    if (r.booking) return [message('assistant.bookingLine', { title: r.booking.title || '' }, { status: stateKey('booking', r.booking.status) }, { time: r.booking.startAt })];
    if ('available' in r) return [message(r.available ? 'assistant.available' : 'assistant.conflict')];
    if ('bookable' in r) return [message('assistant.eligibility', { training: r.missingTraining?.map(t => t.name).join(', ') || '' }, { bookable: r.bookable ? 'enum.boolean.true' : 'enum.boolean.false' }), ...(r.careReason ? [message(`api.${r.careReason}`)] : [])];
    return [message('assistant.guidance')];
  });
}
export function renderAssistantSummary(summary, translate, locale) {
  const formatTime = value => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  return summary.map(segment => segment.text ?? translate(segment.key, { ...segment.params, ...Object.fromEntries(Object.entries(segment.labels || {}).map(([key, id]) => [key, translate(id)])), ...Object.fromEntries(Object.entries(segment.times || {}).map(([key, value]) => [key, formatTime(value)])) })).join('\n');
}
