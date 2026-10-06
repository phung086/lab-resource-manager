import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
for (const url of [base, api]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
assert.ok(process.env.UX_DEMO_PASSWORD);
const output = process.env.UI_SCREENSHOT_DIR || '../artifacts/assistant-api-preparation-20261005/verification';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true });
const checks = [], evidence = [], errors = [];
const check = (value, label) => { assert.ok(value, label); checks.push(label); };
let businessPosts = 0;
try {
  for (const [name, role] of [['admin', 'ADMIN'], ['staff', 'LAB_STAFF'], ['lecturer', 'LECTURER'], ['student', 'STUDENT']]) {
    const auth = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${name}@lrm.local`, password: process.env.UX_DEMO_PASSWORD }) });
    assert.equal(auth.status, 200); const session = await auth.json(); check(session.user.role === role, `${role}: real authenticated identity`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'vi-VN' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.method() === 'POST' && /\/api\/(bookings|payments)(\/|$)/.test(request.url())) businessPosts++; });
    await page.addInitScript(({ accessToken, user }) => { localStorage.setItem('lrm_token', accessToken); localStorage.setItem('lrm_user', JSON.stringify(user)); localStorage.setItem('lrm_locale', 'vi'); }, session);
    await page.goto(`${base}/#/workspace/tai-nguyen`);
    await page.locator('.assistant-launcher').click();
    const dock = page.locator('#lab-assistant-panel'); await dock.waitFor();
    await dock.locator('.assistant-language').getByRole('button', { name: 'VI', exact: true }).click();
    await page.locator('html[lang=vi]').waitFor();
    const ask = async (message, expectedStatus = 200) => {
      const pending = page.waitForResponse(response => response.url().endsWith('/assistant/chat') && response.request().method() === 'POST');
      await dock.locator('#assistant-question').fill(message); await dock.locator('.assistant-compose button').click();
      const response = await pending; assert.equal(response.status(), expectedStatus);
      const body = await response.json(); const request = response.request().postDataJSON();
      await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
      check(!('history' in request) && !('actorId' in request) && !('role' in request), `${role}: transcript and identity not accepted from browser`);
      if (expectedStatus === 200) {
        check(Boolean(body.conversation?.id), `${role}: server owns conversation ID`);
        check(body.provider === 'local', `${role}: no external model claimed before configuration`);
      }
      evidence.push({ role, message, locale: body.locale, status: response.status(), source: body.source, toolsUsed: body.toolsUsed, retainedTurns: body.conversation?.retainedTurns });
      return { body, request };
    };
    const first = await ask('Tìm thiết bị');
    const next = await ask('Cho tôi xem cái thứ hai');
    check(next.request.conversationId === first.body.conversation.id, `${role}: follow-up carries same server ID`);
    check(next.request.workspace === 'resources', `${role}: current workspace included`);
    if (first.body.toolResults[0].result.resources.length >= 2) {
      check(next.body.toolResults[0].result.resource.id === first.body.toolResults[0].result.resources[1].id, `${role}: second choice reads exact authorized resource`);
    } else check(next.body.summary.some(item => item.key === 'assistant.choiceMissing'), `${role}: absent choice is clarified`);
    const text = await dock.innerText();
    await dock.locator('.assistant-minimize').click(); await page.locator('.assistant-launcher').click();
    check((await dock.innerText()).includes('Cho tôi xem cái thứ hai'), `${role}: minimize retains conversation`);
    await dock.locator('.assistant-language').getByRole('button', { name: 'EN', exact: true }).click(); await page.locator('html[lang=en]').waitFor();
    check((await dock.innerText()).includes('Cho tôi xem cái thứ hai'), `${role}: locale preserves original question`);
    check(!/\b(?:assistant|api|enum)\.[A-Za-z_]+/.test(text), `${role}: response has no raw locale keys`);
    await dock.locator('#assistant-question').fill('Keep my unsent draft');
    const deletion = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/assistant/conversations/'));
    await dock.getByRole('button', { name: 'New conversation', exact: true }).click(); assert.equal((await deletion).status(), 204);
    await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
    check(await dock.locator('.assistant-turn').count() === 0, `${role}: new conversation clears rendered turns`);
    check(await dock.locator('#assistant-question').inputValue() === 'Keep my unsent draft', `${role}: reset preserves unsent draft`);
    check(await dock.locator('#assistant-question').evaluate(element => element === document.activeElement), `${role}: reset restores composer focus`);
    const fresh = await ask('Find slots for 60 minutes');
    check(!fresh.request.conversationId && fresh.body.conversation.id !== first.body.conversation.id, `${role}: fresh chat cannot inherit old selection`);
    await page.route('**/api/assistant/chat', async route => {
      const body = route.request().postDataJSON(); body.conversationId = randomUUID();
      await route.continue({ postData: JSON.stringify(body) });
    }, { times: 1 });
    const expired = await ask('Hello again', 409);
    check(expired.body.error.code === 'ASSISTANT_CONVERSATION_EXPIRED', `${role}: actual server rejects missing conversation`);
    check(await dock.locator('#assistant-question').inputValue() === 'Hello again', `${role}: rejected continuation retains draft`);
    check(await dock.locator('.assistant-compose button[type=submit]').isDisabled(), `${role}: expired context requires explicit reset`);
    await dock.getByRole('button', { name: 'New conversation', exact: true }).click();
    const hello = await ask('Hello');
    check(!hello.request.conversationId && hello.body.summary[0].key === 'assistant.introduction', `${role}: reset recovers through real API`);
    await dock.locator('.assistant-about summary').click();
    check((await dock.locator('.assistant-about').innerText()).includes('not connected yet'), `${role}: configuration limit disclosed`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role}: no page horizontal overflow`);
    await page.screenshot({ path: `${output}/${name}-conversation-en.png` });
    const logout = await fetch(`${api}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` } }); assert.equal(logout.status, 204);
    await context.close();
  }
  check(businessPosts === 0, 'No assistant booking or payment POST in any role');
  check(errors.length === 0, 'No uncaught browser errors');
  writeFileSync(`${output}/result.json`, JSON.stringify({ checks: checks.length, labels: checks, evidence, errors, businessPosts }, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, roles: 4, businessPosts, errors: errors.length }));
} finally { await browser.close(); }
