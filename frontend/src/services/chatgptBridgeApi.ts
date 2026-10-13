import { apiRequest } from '../api.js';
import { parseBridgeProposals, type BridgeProposal } from './chatgptBridgeProposals.ts';

export type BridgeRequest = {
  id: string; status: 'PENDING' | 'ANSWERED' | 'EXPIRED' | 'CANCELLED' | 'HANDED_OFF';
  expiresAt: string; answer?: string; locale?: string; generatedAt?: string;
  provider?: 'chatgpt'; source?: 'chatgpt_bridge';
  proposals?: BridgeProposal[];
  conversation?: { id: string; expiresAt: string; retainedTurns?: number };
};
export type BridgeQuestion = {
  message: string; locale: string; workspace?: string; resourceId?: string;
  startAt?: string; endAt?: string; durationMinutes?: number;
  conversationId?: string;
};
type Transport = (path: string, options?: Record<string, unknown>) => Promise<unknown>;
const PREFIX = '/assistant/bridge/requests';
const POLL_MS = 2000, MAX_WAIT_MS = 10 * 60 * 1000;
const REQUEST_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function failure(key: string) { return Object.assign(new Error(key), { code: key }); }
export function bridgeRedirectUrl(value: unknown) {
  if (typeof value !== 'string') throw failure('bridge.invalidRedirect');
  let url: URL;
  try { url = new URL(value); } catch { throw failure('bridge.invalidRedirect'); }
  if (url.origin !== 'https://chatgpt.com' || url.username || url.password || url.hash ||
      !(url.pathname === '/connector_platform_oauth_redirect' || /^\/connector\/oauth\/[A-Za-z0-9_-]{1,200}$/.test(url.pathname))) throw failure('bridge.invalidRedirect');
  return url.href;
}

export type BridgeConnectionState = { enabled: boolean; authorized: boolean; connected: boolean; publicUrl?: string;
  connections: { id: string; clientName: string; createdAt: string; expiresAt: string; subscriptionCount: number }[] };
export type BridgeConsent = { clientName: string; scopes: string[]; expiresAt: string; replacesConnection: boolean };
export const getBridgeConnections = (signal?: AbortSignal): Promise<BridgeConnectionState> => apiRequest('/chatgpt-bridge/connections', { signal });
export const getBridgeConsent = (ticket: string, signal?: AbortSignal): Promise<BridgeConsent> => apiRequest('/chatgpt-bridge/authorization?ticket=' + encodeURIComponent(ticket), { signal });
export const authorizeBridge = (ticket: string, approved: boolean): Promise<{ redirectUrl: string }> => apiRequest('/chatgpt-bridge/authorize', { method: 'POST', body: JSON.stringify({ ticket, approved }) });
export const disconnectBridge = (id: string) => apiRequest('/chatgpt-bridge/connections/' + encodeURIComponent(id), { method: 'DELETE' });

function validateRequest(value: unknown): BridgeRequest {
  const request = value as BridgeRequest;
  if (!request || !REQUEST_ID.test(request.id) || !['PENDING', 'ANSWERED', 'EXPIRED', 'CANCELLED', 'HANDED_OFF'].includes(request.status) || !Number.isFinite(Date.parse(request.expiresAt))) throw failure('bridge.invalidResponse');
  if (request.status === 'ANSWERED' && (typeof request.answer !== 'string' || !request.answer.trim() || request.source !== 'chatgpt_bridge' || request.provider !== 'chatgpt')) throw failure('bridge.invalidResponse');
  if (request.status === 'ANSWERED') request.proposals = parseBridgeProposals(request.proposals);
  else if (request.proposals?.length) throw failure('bridge.invalidResponse');
  return request;
}
function pause(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

// A cancelled create still obtains its ID before cancelling the persisted job.
// Mutations are never retried when a response is lost or uncertain.
export async function askChatgptBridge(question: BridgeQuestion, options: {
  signal: AbortSignal; onPending?: (request: BridgeRequest) => void; transport?: Transport; pollMs?: number;
}): Promise<BridgeRequest> {
  const { signal, onPending, transport = apiRequest, pollMs = POLL_MS } = options;
  if (signal.aborted) throw signal.reason;
  const token = localStorage.getItem('lrm_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let request: BridgeRequest | undefined, answered = false;
  try {
    request = validateRequest(await transport(PREFIX, { method: 'POST', headers, body: JSON.stringify(question) }));
    if (signal.aborted) throw signal.reason;
    onPending?.(request);
    const deadline = Math.min(Date.parse(request.expiresAt), Date.now() + MAX_WAIT_MS);
    while (request.status === 'PENDING') {
      if (Date.now() >= deadline) throw failure('bridge.expired');
      await pause(Math.min(Math.max(1, pollMs), Math.max(1, deadline - Date.now())), signal);
      const next = validateRequest(await transport(`${PREFIX}/${request.id}`, { signal, headers }));
      if (next.id !== request.id) throw failure('bridge.invalidResponse');
      request = next;
      if (signal.aborted) throw signal.reason;
    }
    if (request.status === 'EXPIRED') throw failure('bridge.expired');
    if (request.status === 'CANCELLED' || request.status === 'HANDED_OFF') throw failure('bridge.cancelled');
    answered = true;
    return request;
  } finally {
    if (request && !answered && request.status === 'PENDING') {
      try { await transport(`${PREFIX}/${request.id}`, { method: 'DELETE', headers }); }
      catch { throw failure('bridge.cancelFailed'); }
    }
  }
}
