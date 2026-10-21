import { getVietnamTodayDateString, parseVietnamParts, vietnamTimeToIso } from '../../utils/timezone.ts';
import { minimumBookingNotice } from '../../utils/bookingNotice.ts';

export type PlannerResource = {
  id: string; name: string; code: string; category?: string; operationalStatus?: string;
  bookingState?: string; laboratoryId?: string; maxBookingMinutes?: number;
  availability?: { source?: string };
  labPolicy?: PlannerPolicy;
  laboratory?: { id: string; name: string; isActive?: boolean; labPolicy?: PlannerPolicy };
};
type PlannerPolicy = { workDayStartHour?: number; workDayEndHour?: number; allowWeekend?: boolean; minBookingMinutes?: number; maxBookingMinutes?: number; maxAdvanceBookingDays?: number; minAdvanceBookingMinutes?: number; turnaroundMinutes?: number };
export type PlannerEvent = { id: string; resourceId: string; resourceName?: string; title?: string; titleKey?: string; titleParams?: Record<string, string>; start: string; end: string; type?: string; status?: string; occupancy?: string; paymentDueAt?: string; isMine?: boolean; requestedBy?: { fullName?: string; email?: string } };
export const RESOURCE_GROUPS = ['ROOM', 'EQUIPMENT', 'MACHINE', 'EXPERIMENT_KIT', 'MATERIAL'];
export const CHECK_TTL_MS = 60_000;
export function shiftDate(date: string, days: number) {
  const carrier = new Date(`${date}T00:00:00Z`); carrier.setUTCDate(carrier.getUTCDate() + days);
  return carrier.toISOString().slice(0, 10);
}
export function timeLabel(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
export function resourceBlocked(resource?: PlannerResource | null) {
  return !resource || !['AVAILABLE', 'IN_USE'].includes(resource.operationalStatus || '') || resource.bookingState !== 'bookable' || resource.laboratory?.isActive === false || resource.availability?.source === 'maintenance_policy';
}
export function policyFor(resource: PlannerResource) { return resource.labPolicy || resource.laboratory?.labPolicy; }
export function serviceWindow(resource: PlannerResource) {
  const policy = policyFor(resource), from = policy?.workDayStartHour, to = policy?.workDayEndHour;
  return Number.isFinite(from) && Number.isFinite(to) && from! >= 0 && to! <= 24 && from! < to! ? { from: from! * 60, to: to! * 60 } : null;
}
export function intervalFor(date: string, start: string, end: string) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return null;
    const startAt = vietnamTimeToIso(date, start), endAt = vietnamTimeToIso(date, end);
    if (Date.parse(startAt) >= Date.parse(endAt) || Date.parse(startAt) <= Date.now() || date < getVietnamTodayDateString()) return null;
    // Reject normalized dates such as February 31.
    const parts = parseVietnamParts(startAt)!;
    if (`${parts.year}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}` !== date) return null;
    return { startAt, endAt };
  } catch { return null; }
}
export type FreeWindow = { from: string; to: string; start: string; end: string };
// Remove occupied intervals first, then keep only gaps long enough for the requested session.
// This is a schedule projection; server checks and booking creation remain authoritative.
export function freeWindows(resource: PlannerResource, date: string, duration: number, events: PlannerEvent[], now = Date.now()): FreeWindow[] {
  const hours = serviceWindow(resource), policy = policyFor(resource);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const maxDuration = resource.maxBookingMinutes ?? policy?.maxBookingMinutes;
  if (!hours || resourceBlocked(resource) || !Number.isFinite(duration) || duration <= 0 || (policy?.allowWeekend === false && [0,6].includes(weekday)) || (policy?.minBookingMinutes != null && duration < policy.minBookingMinutes) || (maxDuration != null && duration > maxDuration)) return [];
  const midnight=Date.parse(vietnamTimeToIso(date,'00:00'));
  const lower=Math.max(hours.from,Math.ceil((now+minimumBookingNotice(policy)*60000-midnight)/60000));
  // The booking form currently accepts same-day, minute-resolution intervals.
  const upper=Math.min(hours.to,1439);
  if(lower+duration>upper)return [];
  const occupied=events.filter(event=>event.resourceId===resource.id).map(event=>({from:Math.max(lower,Math.floor((Date.parse(event.start)-midnight)/60000) - (event.type === 'booking' ? policy?.turnaroundMinutes || 0 : 0)),to:Math.min(upper,Math.ceil((Date.parse(event.end)-midnight)/60000))})).filter(event=>event.from<event.to).sort((a,b)=>a.from-b.from);
  const gaps:{from:number;to:number}[]=[];let cursor=lower;
  for(const event of occupied){if(event.from>cursor)gaps.push({from:cursor,to:event.from});cursor=Math.max(cursor,event.to);}
  if(cursor<upper)gaps.push({from:cursor,to:upper});
  return gaps.filter(gap=>gap.to-gap.from>=duration).filter(gap=>!policy?.maxAdvanceBookingDays || midnight+gap.from*60000-now<=policy.maxAdvanceBookingDays*86400000).map(gap=>({from:timeLabel(gap.from),to:timeLabel(gap.to),start:timeLabel(gap.from),end:timeLabel(gap.from+duration)}));
}
export function upcomingFreeDays(resource: PlannerResource, date: string, duration: number, events: PlannerEvent[], rangeEnd: string, now=Date.now()) {
  const results:{date:string;window:FreeWindow}[]=[];
  for(let offset=1;offset<7;offset++){
    const day=shiftDate(date,offset);if(day>=rangeEnd)break;
    const window=freeWindows(resource,day,duration,events,now)[0];
    if(window)results.push({date:day,window});
    if(results.length===3)break;
  }
  return results;
}
