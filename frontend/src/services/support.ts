import { apiRequest } from '../api.js';

export type SupportStatus = 'WAITING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type Person = { id: string; fullName: string; role: string };
export type SupportSession = {
  id: string; ordinal: number; subject: string; category: string; status: SupportStatus;
  laboratoryId: string; requesterId: string; assignedStaffId: string | null;
  requester: Person; assignedStaff: Person | null; laboratory: { id: string; name: string; code: string };
  queuePosition: number | null; staffConnected: boolean; createdAt: string; assignedAt: string | null; closedAt: string | null; resolution: string | null;
};
export type SupportMessage = { id: string; sequence: number; sender: Person | null; kind: string; body: string; source: string; eventType: string | null; createdAt: string };
export type SupportDetail = { session: SupportSession; messages: SupportMessage[]; hasMore: boolean; nextCursor: number };
export type SupportList = { activeSession: SupportSession | null; items: SupportSession[]; pagination: { total: number; totalPages: number; page: number }; summary: Partial<Record<SupportStatus, number>> };
export type SupportMetadata = { laboratories: { id: string; name: string; code: string }[]; presence: { accepting: boolean } | null; quickReplies: { id: string; titleKey: string; bodyKey: string }[] };
const post = (path: string, body: unknown) => apiRequest(`/support${path}`, { method: 'POST', body: JSON.stringify(body) });
export const supportApi = {
  metadata: (signal: AbortSignal): Promise<SupportMetadata> => apiRequest('/support/metadata', { signal }),
  context: (id: string, signal: AbortSignal): Promise<{ message: string; messageCount: number }> => apiRequest(`/support/assistant-context/${encodeURIComponent(id)}`, { signal }),
  list: (query: URLSearchParams, signal: AbortSignal): Promise<SupportList> => apiRequest(`/support/sessions?${query}`, { signal }),
  detail: (id: string, after: number, signal: AbortSignal): Promise<SupportDetail> => apiRequest(`/support/sessions/${encodeURIComponent(id)}?after=${after}`, { signal }),
  request: (body: { requestId: string; laboratoryId: string; category: string; message: string; conversationId?: string }): Promise<SupportSession> => post('/sessions', body),
  presence: (accepting?: boolean): Promise<{ accepting: boolean }> => post('/presence', accepting === undefined ? {} : { accepting }),
  send: (id: string, messageId: string, body: string): Promise<SupportMessage> => post(`/sessions/${encodeURIComponent(id)}/messages`, { messageId, body }),
  transition: (id: string, action: 'finish' | 'cancel' | 'requeue', reason: string): Promise<SupportSession> => post(`/sessions/${encodeURIComponent(id)}/${action}`, { reason }),
};
