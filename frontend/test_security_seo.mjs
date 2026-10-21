import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PUBLIC_SEO, publicSiteOrigin, seoForPath } from './src/utils/seo.js';
import { getAccessToken, getAuthUser, saveAuth, removeAuth } from './src/services/authStorage.js';
import { workspaceActorScope, workspaceDataIsCurrent } from './src/utils/workspaceScope.js';

test('cached private workspace data stays hidden after switching account or role, including late old-account reads', async () => {
  const oldActor = { id: 'first-account', role: 'ADMIN', authVersion: 2 };
  let actor = oldActor, loadedScope = workspaceActorScope(oldActor), release;
  const oldRead = new Promise(resolve => { release = resolve; }).then(() => { loadedScope = workspaceActorScope(oldActor); });
  assert.equal(workspaceDataIsCurrent(loadedScope, actor), true);
  actor = { id: 'second-account', role: 'CUSTOMER', authVersion: 0 };
  assert.equal(workspaceDataIsCurrent(loadedScope, actor), false);
  release(); await oldRead;
  assert.equal(workspaceDataIsCurrent(loadedScope, actor), false, 'A late response cannot display the previous account cache');
  loadedScope = workspaceActorScope(actor);
  assert.equal(workspaceDataIsCurrent(loadedScope, actor), true);
  for (const changed of [null, { ...actor, role: 'ADMIN' }, { ...actor, authVersion: 1 }]) assert.equal(workspaceDataIsCurrent(loadedScope, changed), false);
  assert.equal(workspaceDataIsCurrent(null, null), false);
});

test('credentials use tab storage only; sign-in clears legacy persistent credentials and sign-out removes both', () => {
  const original = { sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage, window: globalThis.window };
  const tab = new Map(), persistent = new Map([['lrm_token', 'legacy']]);
  const storage = data => ({ getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) });
  try {
    globalThis.sessionStorage = storage(tab); globalThis.localStorage = storage(persistent); globalThis.window = { dispatchEvent() {} };
    assert.equal(getAccessToken(), null, 'Never revive a localStorage token');
    saveAuth({ accessToken: 'tab-only-token', user: { id: 'owner' } });
    assert.equal(getAccessToken(), 'tab-only-token'); assert.equal(persistent.size, 0); assert.equal(JSON.parse(getAuthUser()).id, 'owner');
    removeAuth(); assert.equal(tab.size, 0); assert.equal(persistent.size, 0);
  } finally { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
});
test('public indexing is explicit; private, authentication and unknown routes never acquire canonical or index', () => {
  assert.equal(publicSiteOrigin('https://lab.example.edu.vn'), 'https://lab.example.edu.vn');
  for (const url of ['http://lab.example.edu.vn', 'https://localhost', 'https://user:secret@lab.example.edu.vn', 'https://lab.example.edu.vn/path', 'https://lab.example.edu.vn?tracking=1']) assert.throws(() => publicSiteOrigin(url));
  for (const path of Object.keys(PUBLIC_SEO)) {
    assert.match(seoForPath(path).robots, /noindex/);
    assert.match(seoForPath(path, { origin: 'https://lab.example.edu.vn', indexable: true }).robots, /^index/);
  }
  for (const path of ['/workspace/profile', '/workspace/payments', '/login', '/unknown']) {
    const policy = seoForPath(path, { origin: 'https://lab.example.edu.vn', indexable: true });
    assert.match(policy.robots, /noindex/); assert.equal(policy.canonical, '');
  }
});
test('all four public SEO entries have distinct, complete VI/EN metadata', async () => {
  for (const locale of ['vi', 'en']) {
    const { messages } = JSON.parse(await readFile(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url)));
    const titles = [];
    for (const item of Object.values(PUBLIC_SEO)) { assert.ok(messages[item.titleKey]?.length > 20); assert.ok(messages[item.descriptionKey]?.length > 70); titles.push(messages[item.titleKey]); }
    assert.equal(new Set(titles).size, 4);
  }
});
