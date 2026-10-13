// One route registry and one browser-history adapter for all pages.
export const WORKSPACE_ROUTES = Object.freeze({
  home: 'overview', resources: 'resources', smart_calendar: 'calendar', bookings: 'bookings',
  dashboard: 'operations', maintenance: 'maintenance', incidents: 'incidents',
  stock: 'materials', teaching: 'teaching', admin_management: 'resource-management',
  users: 'users', profile: 'profile', escalations: 'notifications',
  monitoring: 'monitoring', payments: 'payments', support: 'support'
});
export const PUBLIC_ROUTES = Object.freeze({
  home: '/', resources: '/resources', schedule: '/schedule', process: '/how-it-works',
  login: '/login', register: '/register'
});
const OLD_WORKSPACE_ROUTES = Object.freeze({
  'tong-quan': 'home', 'tai-nguyen': 'resources', 'lich-dat': 'smart_calendar', booking: 'bookings',
  'van-hanh': 'dashboard', 'bao-tri': 'maintenance', 'su-co': 'incidents', 'kho-vat-tu': 'stock',
  'lop-hoc-phan': 'teaching', 'quan-ly-tai-nguyen': 'admin_management', 'nguoi-dung': 'users',
  'ho-so': 'profile', 'thong-bao': 'escalations', telemetry: 'monitoring', 'thanh-toan': 'payments'
});
const OLD_PUBLIC_ROUTES = Object.freeze({
  'dau-trang': 'home', 'gioi-thieu': 'home', 'tai-nguyen': 'resources',
  'kiem-tra-lich': 'schedule', 'quy-trinh': 'process', 'dang-nhap': 'login', 'dang-ky': 'register'
});
function withQuery(path, params) {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(
    Object.entries(params || {}).filter(([, value]) => value !== '' && value != null).map(([key, value]) => [key, String(value)])
  );
  return `${path}${query.size ? `?${query}` : ''}`;
}
export function workspacePathForTab(tab, params = {}) {
  if (!Object.hasOwn(WORKSPACE_ROUTES, tab)) throw new Error(`Unknown workspace tab: ${tab}`);
  return withQuery(`/workspace/${WORKSPACE_ROUTES[tab]}`, params);
}
// A detail remains in the resource navigation family, with one concrete screen URL.
export function resourceDetailPath(resourceId, params = {}) {
  if (typeof resourceId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(resourceId)) throw new Error('Invalid resource identifier');
  return withQuery(`/workspace/resources/${encodeURIComponent(resourceId)}`, params);
}
export function resourceSelectionPath(params = {}) { return withQuery('/workspace/selection', params); }
export function publicPathForSection(section, params = {}) {
  const page = OLD_PUBLIC_ROUTES[section] || section;
  if (!Object.hasOwn(PUBLIC_ROUTES, page)) throw new Error(`Unknown public page: ${section}`);
  return withQuery(PUBLIC_ROUTES[page], params);
}
export function readAppRoute(location = window.location) {
  const url = typeof location === 'string' ? new URL(location, 'http://lrm.invalid') : location;
  let path = url.pathname || '/';
  let search = url.search || '';
  let fragment = url.hash || '';
  if (fragment.startsWith('#/')) {
    const legacy = new URL(fragment.slice(1), 'http://lrm.invalid');
    path = legacy.pathname; search = legacy.search; fragment = '';
  } else if (path === '/' && Object.hasOwn(OLD_PUBLIC_ROUTES, fragment.slice(1))) {
    path = publicPathForSection(fragment.slice(1)); fragment = '';
  }
  path = path === '/' ? path : path.replace(/\/+$/, '');
  const segment = path.startsWith('/workspace/') ? path.slice('/workspace/'.length) : '';
  const resourceMatch = /^resources\/([a-zA-Z0-9_-]{1,128})$/.exec(segment);
  if (resourceMatch) {
    const canonicalPath = resourceDetailPath(resourceMatch[1]);
    return { kind: 'workspace', tab: 'resources', screen: 'resource-detail', resourceId: resourceMatch[1], page: '', path: canonicalPath, search, fragment, canonicalUrl: `${canonicalPath}${search}${fragment}` };
  }
  if (segment === 'selection') {
    return { kind: 'workspace', tab: 'resources', screen: 'resource-selection', page: '', path, search, fragment, canonicalUrl: `${path}${search}${fragment}` };
  }
  const tab = Object.keys(WORKSPACE_ROUTES).find(key => WORKSPACE_ROUTES[key] === segment) || OLD_WORKSPACE_ROUTES[segment];
  if (tab === 'resources') {
    const params = new URLSearchParams(search);
    const legacyResource = params.get('resource');
    if (legacyResource && /^[a-zA-Z0-9_-]{1,128}$/.test(legacyResource)) {
      params.delete('resource');
      const canonicalPath = resourceDetailPath(legacyResource);
      search = params.size ? `?${params}` : '';
      return { kind: 'workspace', tab, screen: 'resource-detail', resourceId: legacyResource, page: '', path: canonicalPath, search, fragment, canonicalUrl: `${canonicalPath}${search}${fragment}` };
    }
  }
  if (tab) {
    const canonicalPath = workspacePathForTab(tab);
    return { kind: 'workspace', tab, page: '', path: canonicalPath, search, fragment, canonicalUrl: `${canonicalPath}${search}${fragment}` };
  }
  const page = Object.keys(PUBLIC_ROUTES).find(key => PUBLIC_ROUTES[key] === path) || OLD_PUBLIC_ROUTES[path.slice(1)];
  if (page) {
    const canonicalPath = PUBLIC_ROUTES[page];
    return { kind: ['login', 'register'].includes(page) ? 'auth' : 'public', tab: '', page, path: canonicalPath, search, fragment, canonicalUrl: `${canonicalPath}${search}${fragment}` };
  }
  return { kind: 'not-found', tab: '', page: '', path, search, fragment, canonicalUrl: `${path}${search}${fragment}` };
}
export function readRouteParams(location = window.location) { return new URLSearchParams(readAppRoute(location).search); }
// Only a known workspace path can be an authentication return destination.
export function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '';
  const route = readAppRoute(value);
  return route.kind === 'workspace' ? route.canonicalUrl : '';
}
export function navigateApp(path, { replace = false, notify = true } = {}) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) return;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== path) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  }
  if (notify) window.dispatchEvent(new Event('lrm:route-change'));
}
// Compatibility for previously shared links. New navigation uses real paths.
export function tabFromHash(hash) { return readAppRoute(hash).tab || 'home'; }
export function hashForTab(tab) { return `#${workspacePathForTab(tab)}`; }
