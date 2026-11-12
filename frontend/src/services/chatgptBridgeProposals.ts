export type BridgeBookingDraft = {
  kind: 'BOOKING'; id: string; expiresAt: string; resourceId: string;
  resourceName: string; resourceCode: string; startAt: string; endAt: string;
  title: string; purpose: string; purposeCode: 'STUDY' | 'TEACHING' | 'RESEARCH' | 'SERVICE';
  quote: { amountVnd: number; currency: 'VND'; version: number };
};
export type BridgeSupportDraft = {
  kind: 'STAFF_SUPPORT'; id: string; expiresAt: string; laboratoryId: string;
  laboratoryName: string; category: 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'RESOURCE' | 'OTHER'; message: string;
};
export type BridgeProposal = BridgeBookingDraft | BridgeSupportDraft;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = () => Object.assign(new Error('bridge.invalidResponse'), { code: 'bridge.invalidResponse' });
const date = (value: unknown) => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const text = (value: unknown, max: number, min = 3) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));

export function parseBridgeProposals(value: unknown): BridgeProposal[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2) throw invalid();
  const kinds = new Set();
  return value.map(item => {
    if (!item || typeof item !== 'object' || kinds.has(item.kind) || !uuid.test(item.id) || !date(item.expiresAt)) throw invalid();
    kinds.add(item.kind);
    if (item.kind === 'BOOKING') {
      if (!exact(item, ['kind', 'id', 'expiresAt', 'resourceId', 'resourceName', 'resourceCode', 'startAt', 'endAt', 'title', 'purpose', 'purposeCode', 'quote']) ||
        !uuid.test(item.resourceId) || !text(item.resourceName, 255, 1) || !text(item.resourceCode, 100, 1) || !date(item.startAt) || !date(item.endAt) ||
        Date.parse(item.endAt) <= Date.parse(item.startAt) || !text(item.title, 255) || !text(item.purpose, 2000) ||
        !['STUDY', 'TEACHING', 'RESEARCH', 'SERVICE'].includes(item.purposeCode) || !item.quote ||
        !exact(item.quote, ['amountVnd', 'currency', 'version']) || !Number.isSafeInteger(item.quote.amountVnd) || item.quote.amountVnd < 0 || item.quote.amountVnd > 2000000000 ||
        item.quote.currency !== 'VND' || !Number.isSafeInteger(item.quote.version) || item.quote.version < 0) throw invalid();
      return item as BridgeBookingDraft;
    }
    if (item.kind !== 'STAFF_SUPPORT' || !exact(item, ['kind', 'id', 'expiresAt', 'laboratoryId', 'laboratoryName', 'category', 'message']) ||
      !uuid.test(item.laboratoryId) || !text(item.laboratoryName, 255, 1) || !text(item.message, 2000) ||
      !['BOOKING', 'PAYMENT', 'ACCOUNT', 'RESOURCE', 'OTHER'].includes(item.category)) throw invalid();
    return item as BridgeSupportDraft;
  });
}

// Opening a review form performs no request or business mutation.
export function reviewBridgeProposal(proposal: BridgeProposal, now = Date.now()): BridgeProposal {
  const [validated] = parseBridgeProposals([proposal]);
  if (Date.parse(validated.expiresAt) <= now || (validated.kind === 'BOOKING' && Date.parse(validated.startAt) <= now)) {
    throw Object.assign(new Error('bridge.proposalExpired'), { code: 'bridge.proposalExpired' });
  }
  return validated;
}
