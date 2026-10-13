import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORKSPACE_ROUTES, PUBLIC_ROUTES, readAppRoute, readRouteParams, publicPathForSection, workspacePathForTab, safeReturnTo, navigateApp, resourceDetailPath, resourceSelectionPath } from './src/workspaceRoutes.js';

test('every public and workspace screen has a unique English path', () => {
  const paths = [...Object.values(PUBLIC_ROUTES), ...Object.keys(WORKSPACE_ROUTES).map(workspacePathForTab)];
  assert.equal(new Set(paths).size, paths.length);
  for (const path of paths) { assert.match(path, /^\/[a-z/-]*$/); assert.notEqual(readAppRoute(path).kind, 'not-found'); }
  assert.equal(publicPathForSection('dang-nhap'), '/login');
  assert.equal(publicPathForSection('dang-ky'), '/register');
  assert.throws(() => workspacePathForTab('unsupported'));
});

test('legacy hash and Vietnamese paths retain exact resource and booking context', () => {
  assert.equal(readAppRoute('/workspace/resources?resource=eq-01&search=Camera&category=EQUIPMENT').canonicalUrl, '/workspace/resources/eq-01?search=Camera&category=EQUIPMENT');
  assert.equal(readAppRoute('/#/workspace/tai-nguyen?resource=eq-01').resourceId, 'eq-01');
  assert.equal(readAppRoute('/#/workspace/lich-dat?resource=eq%2F01').canonicalUrl, '/workspace/calendar?resource=eq%2F01');
  assert.equal(readAppRoute('/workspace/booking?booking=b-2&action=check-out').canonicalUrl, '/workspace/bookings?booking=b-2&action=check-out');
  assert.equal(readAppRoute('/#dang-nhap').canonicalUrl, '/login');
  assert.equal(readAppRoute('/dang-nhap').canonicalUrl, '/login');
  assert.equal(readRouteParams('/#/workspace/lop-hoc-phan?group=a%26b').get('group'), 'a&b');
  assert.equal(readAppRoute('/resources#noi-dung').canonicalUrl, '/resources#noi-dung');
  assert.equal(readAppRoute('/workspace/calendar?resource=one#workspace-main').tab, 'smart_calendar');
});

test('route queries encode identifiers and preserve zero values without guessing a target', () => {
  const path = workspacePathForTab('bookings', { booking: 'id /?#', filter: 'CONFIRMED', empty: '', page: 0 });
  assert.equal(readRouteParams(path).get('booking'), 'id /?#');
  assert.equal(readRouteParams(path).get('filter'), 'CONFIRMED');
  assert.equal(readRouteParams(path).get('page'), '0');
  assert.equal(readAppRoute('/workspace/not-a-screen').kind, 'not-found');
  assert.equal(readAppRoute('/not-a-screen').kind, 'not-found');
});

test('login return destinations reject external, malformed and unknown addresses', () => {
  assert.equal(safeReturnTo('/workspace/calendar?resource=one'), '/workspace/calendar?resource=one');
  assert.equal(safeReturnTo('/workspace/lich-dat'), '/workspace/calendar');
  for (const value of ['https://evil.example/workspace/calendar', '//evil.example/workspace/calendar', '/\\evil.example', '/login', '/unknown', null, '/workspace/calendar\n']) assert.equal(safeReturnTo(value), '');
});

test('resource detail and selection retain navigation family and safe return context', () => {
  const path = resourceDetailPath('79a824db-c373-4407-8dbd-ad77042f600f', { search: 'room & equipment', category: 'ROOM' });
  const detail = readAppRoute(path);
  assert.equal(detail.tab, 'resources');
  assert.equal(detail.screen, 'resource-detail');
  assert.equal(detail.resourceId, '79a824db-c373-4407-8dbd-ad77042f600f');
  assert.equal(safeReturnTo(path), path);
  assert.equal(readRouteParams(path).get('search'), 'room & equipment');
  const selection = resourceSelectionPath({ returnTo: '/workspace/resources?category=ROOM' });
  assert.equal(readAppRoute(selection).screen, 'resource-selection');
  assert.equal(safeReturnTo(selection), selection);
  assert.equal(readAppRoute('/#/workspace/resources/equipment_1?filter=AVAILABLE').canonicalUrl, '/workspace/resources/equipment_1?filter=AVAILABLE');
  // Legacy identity moves into the detail path; unrelated catalogue context remains.
  assert.equal(readAppRoute('/workspace/resources?resource=equipment_1&search=scope').resourceId, 'equipment_1');
  assert.equal(readRouteParams('/workspace/resources?resource=equipment_1&search=scope').get('search'), 'scope');
  for (const id of ['', '../login', 'a/b', 'a?x=1', '%2f', 'a'.repeat(129)]) assert.throws(() => resourceDetailPath(id));
  for (const path of ['/workspace/resources/a/b', '/workspace/resources/%2F', '/workspace/selection/extra']) assert.equal(readAppRoute(path).kind, 'not-found');
});

test('history navigation creates one entry and query-only replacements can preserve mounted forms', () => {
  const writes = [], events = [];
  globalThis.window = {
    location: { pathname: '/workspace/bookings', search: '', hash: '' },
    history: { pushState: (...args) => writes.push(['push', args[2]]), replaceState: (...args) => writes.push(['replace', args[2]]) },
    dispatchEvent: event => events.push(event.type)
  };
  navigateApp('/workspace/calendar?resource=one');
  navigateApp('/workspace/bookings?filter=CONFIRMED', { replace: true, notify: false });
  navigateApp('//evil.example');
  assert.deepEqual(writes, [['push', '/workspace/calendar?resource=one'], ['replace', '/workspace/bookings?filter=CONFIRMED']]);
  assert.deepEqual(events, ['lrm:route-change']);
  delete globalThis.window;
});
