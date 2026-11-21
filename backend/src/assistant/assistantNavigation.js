const resourceTools = new Set(['search_resources', 'recommend_equipment', 'get_resource_detail']);
export const isResourceLookup = tool => resourceTools.has(tool);

// Only resource IDs read by an authorized tool may become navigation targets.
export function resourceLinksForResult(tool, result) {
  if (result?.error || result?.deferred) return [];
  const resources = tool === 'get_resource_detail' ? [result?.resource] :
    isResourceLookup(tool) && Array.isArray(result?.resources) ? result.resources : [];
  return resources.filter(resource => typeof resource?.id === 'string' && typeof resource.name === 'string')
    .slice(0, 5).map(({ id, name }) => ({ id, name }));
}

const addressPattern = [
  String.raw`https?:\/\/[^\s()<>\x60]+`,
  String.raw`(?<![\w/])(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?=[:/])[^ \s()<>\x60]*`,
  String.raw`(?<![\w/])\/(?:workspace|api|mcp|oauth)(?=[/?#\s)\x60.,;:!?]|$)[^\s()<>\x60]*`,
  String.raw`(?:file:\/\/|(?<!\w)[A-Z]:\\)[^\s()<>\x60]+`
].join('|');
const answerAddresses = new RegExp(
  '\\[([^\\]\\n]+)\\]\\((' + addressPattern + ')\\)|`?(' + addressPattern + ')`?', 'gi'
);
const internalRoute = /^\/(?:workspace|api|mcp|oauth)(?:[/?#]|$)/i;
const bridgeEndpoint = /^\/(?:mcp\/support-bridge|oauth\/chatgpt)(?:\/|$)/i;
const localHost = /^(?:localhost\.?|127(?:\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)$/i;

export function customerFacingAnswer(answer, locale, backendOrigin) {
  const destination = locale === 'en' ? 'the corresponding page in LAB' : 'mục tương ứng trong LAB';
  return answer.replace(answerAddresses, (match, label, linkAddress, bareAddress) => {
    const address = linkAddress || bareAddress;
    const punctuation = bareAddress?.match(/[.,;!?]+$/)?.[0] || '';
    const url = /^https?:\/\//i.test(address) ? URL.parse(address) : null;
    if (url && !localHost.test(url.hostname) && !bridgeEndpoint.test(url.pathname) &&
        !(url.origin === backendOrigin && internalRoute.test(url.pathname))) return match;
    return label ? customerFacingAnswer(label, locale, backendOrigin) : destination + punctuation;
  });
}
