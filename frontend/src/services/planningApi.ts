import { apiRequest } from '../api.js';
export type Plan = { resourceIds: string[]; startAt: string; endAt: string; purposeCode: string };
export type Quote = { amountVnd: number; version: number; loyaltyPolicyVersion?: number | null };
export type Review = { items: { resource: { id: string; code: string; name: string }; quote: Quote }[]; amountVnd: number };
export type Policy = { revision: number; minAdvanceBookingMinutes: number; minBookingMinutes: number; maxBookingMinutes: number;
  maxAdvanceBookingDays: number; workDayStartHour: number; workDayEndHour: number; turnaroundMinutes: number; allowWeekend: boolean };
export type Lab = { id: string; name: string; labPolicy: Policy | null };
export const planningApi = {
  get: <T,>(path: string, signal?: AbortSignal): Promise<T> => apiRequest(`/planning${path}`, { signal }),
  post: <T,>(path: string, body: unknown): Promise<T> => apiRequest(`/planning${path}`, { method: 'POST', body: JSON.stringify(body) }),
  policy: (id: string, body: unknown): Promise<Policy> => apiRequest(`/planning/policies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  cancelWait: (id: string) => apiRequest(`/planning/waitlist/${id}`, { method: 'DELETE' }),
  labs: (signal?: AbortSignal): Promise<Lab[]> => apiRequest('/laboratories', { signal })
};
export function vietnamInputToIso(value: string) { return new Date(`${value}:00+07:00`).toISOString(); }
export function vietnamInput(value: string | number) { return new Date(+new Date(value) + 7 * 3600000).toISOString().slice(0,16); }
