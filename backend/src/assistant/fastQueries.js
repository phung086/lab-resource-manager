import { bridgeTimeContext } from '../chatgptBridge/timeContext.js';

export const normalizedQuestion = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?!.,…]+$/g, '').trim();

// Deliberately bounded intent grammar. Mixed requests and unsupported dates go
// to Work rather than silently returning a different question/window.
export function fastQueryPlan(data, now = new Date()) {
  const n = normalizedQuestion(data.message), step = (name, input = {}) => ({ name, input });
  if (data.resourceId && /^(?:xem |cho toi xem |show )?(?:thong tin (?:tai nguyen|thiet bi|phong)|resource details?|selected resource)$/.test(n))
    return step('get_resource_detail', { resourceId: data.resourceId });
  const catalogue = /^(?:co nhung|danh sach|liet ke|list|what) (phong|rooms?|thiet bi|equipment|tai nguyen|resources?)(?: (?:nao|gi|are available|are there))?$/.exec(n);
  if (catalogue) return step('search_resources', { ...(/phong|room/.test(catalogue[1]) ? { category: 'ROOM' } : /thiet bi|equipment/.test(catalogue[1]) ? { category: 'EQUIPMENT' } : {}), limit: 10 });
  const free = /^(?:tim|xem|kiem tra|find|show|check) (?:lich trong|khung gio trong|free slots?|available slots?)(?: (?:trong|for) (\d+) (?:phut|minutes?))?$/.exec(n);
  if (free) {
    const minutes = data.durationMinutes ?? Number(free[1] || 60);
    if (Number.isInteger(minutes) && minutes >= 15 && minutes <= 480) return step('find_available_slots', { durationMinutes: minutes, limit: 5,
      ...(data.resourceId ? { resourceId: data.resourceId } : {}), ...(data.startAt ? { from: data.startAt, to: data.endAt } : {}) });
    return null;
  }
  const resources = /^(?:tim|xem|find|show|search) (phong|rooms?|thiet bi|equipment|tai nguyen|resources?)(?: (LOCAL-[A-Z0-9-]+))?$/i.exec(n);
  if (resources) return step('search_resources', { ...(/phong|room/.test(resources[1]) ? { category: 'ROOM' } : /thiet bi|equipment/.test(resources[1]) ? { category: 'EQUIPMENT' } : {}),
    ...(resources[2] ? { query: resources[2].toUpperCase() } : {}), limit: 10 });
  if (/^(?:cho (?:toi|minh) (?:xem )?|xem |kiem tra |check |show (?:me )?)?(?:ton kho|kho vat tu|vat tu(?: trong kho)?|material stock|inventory|stock)(?: (?:cua lab|hien tai|current))?$/.test(n)) return step('get_material_stock');
  const customers = /^(?:(?:tìm|tra cứu|xem|lấy|search|find|list)\s+)?(?:(?:thông tin|danh sách)\s+)?(?:khách hàng|customers?|customer information)(?:\s+(?:tên|named))?\s*:?\s*(.*)$/iu.exec(data.message.trim().replace(/[?!]+$/, ''));
  if (customers) {
    const raw = customers[1].trim();
    if (raw.length <= 120 && !/\b(va|and|booking|payment)\b|lich|thanh toan/.test(normalizedQuestion(raw))) return step('search_customers', raw ? { query: raw } : {});
  }
  if (/^(?:xem |cho toi xem |show |kiem tra )?(?:thong ke|bao cao(?: van hanh)?|operations report|operational report)(?: (?:trong |last )?(7|30) (?:ngay|days))?$/.test(n)) return step('get_operations_report', { days: Number(n.match(/\b(7|30)\b/)?.[1] || 7) });
  if (/^(?:xem |show )?(?:tong quan(?: van hanh)?|operational summary|overview)$/.test(n)) return step('get_operational_summary');
  const schedule = /^(?:xem |kiem tra |cho toi xem |show (?:me )?|check )?(?:lich(?: dat)?(?: cua toi| trong lab)?|my bookings|(?:lab )?schedule|bookings)(?: (hom nay|ngay mai|tuan nay|today|tomorrow|this week))?$/.exec(n);
  if (schedule) {
    if (data.startAt && data.endAt) return step('get_lab_schedule', { startAt: data.startAt, endAt: data.endAt, ...(data.resourceId ? { resourceId: data.resourceId } : {}) });
    const relative = schedule[1] || 'today', time = bridgeTimeContext(now);
    let day = /ngay mai|tomorrow/.test(relative) ? time.tomorrow : time.today, days = 1;
    if (/tuan nay|this week/.test(relative)) {
      const local = new Date(day + 'T00:00:00+07:00'), weekday = new Date(+local + 7 * 3600000).getUTCDay();
      day = new Date(+local + 7 * 3600000 - ((weekday + 6) % 7) * 86400000).toISOString().slice(0, 10); days = 7;
    }
    const start = new Date(day + 'T00:00:00+07:00');
    return step('get_lab_schedule', { startAt: start.toISOString(), endAt: new Date(+start + days * 86400000).toISOString(), ...(data.resourceId ? { resourceId: data.resourceId } : {}) });
  }
  return null;
}
