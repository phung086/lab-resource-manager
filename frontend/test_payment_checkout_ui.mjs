import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Isolated HTTP fixtures; never contact a bank, SMTP server or business database.
const base=process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const output=process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-payment-email-polish`;
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const user={id:'checkout-qa',role:'CUSTOMER',fullName:'Checkout QA',email:'checkout@example.test',isActive:true};
const results=[];
try {
  for(const scenario of ['hold','paid','cancelled','reconciliation','unavailable','failed','expired-hold','home-delivery']) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(user=>{sessionStorage.setItem('lrm_token','isolated-checkout');sessionStorage.setItem('lrm_user',JSON.stringify(user));localStorage.setItem('lrm_locale','vi');},{...user});
    const startAt=new Date(Date.now()+86400000).toISOString();
    const booking={id:'checkout-booking',bookingCode:'LAB-QA-CHECKOUT',requestedById:user.id,title:'Preview equipment session',status:['cancelled','reconciliation'].includes(scenario)?'CANCELLED':['paid','failed','unavailable'].includes(scenario)?'CONFIRMED':'PENDING_APPROVAL',paymentDueAt:['hold','expired-hold'].includes(scenario)?new Date(Date.now()+(scenario==='hold'?90000:-60000)).toISOString():null,feeAmountVnd:240000,startAt,endAt:new Date(Date.now()+90000000).toISOString(),resource:{code:'GPU-QA',name:'Preview GPU workstation',category:'EQUIPMENT'}};
    if (scenario === 'home-delivery') {
      booking.paymentDueAt = new Date(Date.now() + 12 * 60000).toISOString();
      booking.fulfillmentSnapshot = { mode: 'HOME_DELIVERY', deliveryFeeVnd: 0 };
    }
    const charge={id:'checkout-charge',userId:user.id,amount:240000,currency:'VND',status:['paid','reconciliation'].includes(scenario)?'success':scenario==='failed'?'failed':'pending',provider:['paid','reconciliation'].includes(scenario)?'vnpay':'unselected',txnRef:'QA-TRANSACTION',paidAt:scenario==='paid'?new Date().toISOString():null,paymentUrlExpiresAt:null,reconciliationStatus:scenario==='reconciliation'?'manual_review':'none',reconciliationReason:null};
    let writes=0, receiptReads=0;const errors=[];
    await context.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;let data=[];
      if(path==='/api/auth/me')data=user;
      else if(['/api/auth/session','/api/auth/activity'].includes(path))data={idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
      else if(path==='/api/bookings/checkout-booking')data=booking;
      else if(path==='/api/payments/booking/checkout-booking')data=[charge];
      else if(path==='/api/payments/my')data={transactions:[charge],providers:{vnpay:scenario!=='unavailable',vietqr:false}};
      else if(path==='/api/payments/checkout-charge/receipt') {
        receiptReads++;
        if(scenario==='paid' && receiptReads===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});
        data={transaction:{...charge,user,booking},generatedAt:new Date().toISOString()};
      }
      else if(path==='/api/payments/checkout-charge/vnpay') {writes++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_REQUEST_FAILED'})});}
      else if(route.request().method()!=='GET')throw new Error('Unexpected mutation '+path);
      await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/workspace/payments?booking=checkout-booking');await page.locator('.checkout-banner').waitFor();
    assert.ok((await page.locator('.checkout-banner').innerText()).includes('240.000'));
    if(scenario==='cancelled')assert.match(await page.locator('.checkout-banner-status').innerText(),/Đã hủy/);
    if(scenario==='reconciliation')assert.match(await page.locator('.checkout-banner-status').innerText(),/Cần đối soát/);
    if(['cancelled','reconciliation','paid','expired-hold'].includes(scenario))assert.equal(await page.locator('.booking-checkout-payment .primary-button').count(),0);
    if(scenario==='unavailable')assert.equal(await page.locator('.booking-checkout-payment .primary-button').isDisabled(),true);
    if (scenario === 'home-delivery') {
      const deliveryFee = page.getByText('Phí giao tận nơi', { exact: true });
      assert.match(await deliveryFee.locator('xpath=following-sibling::dd[1]').innerText(), /^0\s*₫$/);
      assert.ok(await page.locator('.booking-checkout-payment .primary-button').isEnabled());
      assert.ok(await page.getByRole('button', { name: /Chuyển khoản VietQR.*Chưa cấu hình/ }).isDisabled());
      assert.equal(await page.locator('.booking-checkout .payment-provider-choices button').count(), 2);
    }
    if(scenario==='hold') {
      assert.equal(await page.locator('.payment-hold-notice.is-urgent').count(),1);
      await page.locator('.booking-checkout-payment .primary-button').click();
      await page.waitForFunction(()=>document.activeElement?.matches('.booking-checkout>.alert.danger'));
      assert.equal(writes,1);assert.equal(new URL(page.url()).hostname,'127.0.0.1');
    }
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,scenario+' overflow');
      await page.locator('.checkout-banner').scrollIntoViewIfNeeded();
      if(['hold','paid','reconciliation','home-delivery'].includes(scenario))await page.screenshot({path:`${output}/checkout-${scenario}-${width}.png`,fullPage:true});
    }
    if(['paid','reconciliation'].includes(scenario)) {
      const openReceipt=page.getByRole('button',{name:'Mở biên nhận',exact:true});
      await openReceipt.click();
      if(scenario==='paid') {
        await page.waitForFunction(()=>document.activeElement?.matches('.booking-checkout-status>.alert.danger'));
        assert.equal(await page.getByRole('dialog').count(),0,'Failed receipt read must not open a blank dialog');
        await openReceipt.click();
      }
      await page.locator('.payment-receipt').waitFor();
      assert.match(await page.locator('.payment-receipt').innerText(),/LAB-QA-CHECKOUT/);
      assert.equal(await page.locator('.receipt-review').count(),scenario==='reconciliation'?1:0);
      if(scenario==='reconciliation')assert.match(await page.locator('.payment-receipt dd').allTextContents().then(rows=>rows.join(' ')),/Đã hủy/);
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Receipt overflow');
        await page.locator('.modal-container-2026').screenshot({path:`${output}/receipt-${scenario}-${width}.png`});
      }
      await page.getByRole('dialog').getByRole('button',{name:'EN',exact:true}).click();
      await page.locator('.receipt-verified').getByText('Payment verified',{exact:true}).waitFor();
      if(scenario==='reconciliation')assert.match(await page.locator('.receipt-review').innerText(),/does not restore a cancelled booking/);
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('.receipt-disclaimer').isVisible(),true,'Tax disclaimer remains visible on print');
      assert.equal(await page.locator('.modal-footer-2026').isVisible(),false,'Do not print modal controls');
      assert.equal(await page.locator('.checkout-banner').isVisible(),false,'Do not print the checkout behind the receipt');
      await page.pdf({path:`${output}/receipt-${scenario}.pdf`,format:'A4'});
      await page.emulateMedia({media:'screen'});
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.getByRole('button',{name:'Open receipt',exact:true}).evaluate(el=>el===document.activeElement),true,'Restore focus to receipt trigger');
    }
    if(scenario==='paid')await page.locator('.checkout-action-heading').getByText('Next step').waitFor();
    assert.deepEqual(errors,[]);results.push({scenario,passed:true});await context.close();
  }
  for (const [width, locale] of [[1440, 'vi'], [390, 'en']]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ user, locale }) => {
      sessionStorage.setItem('lrm_token', 'isolated-transfer');
      sessionStorage.setItem('lrm_user', JSON.stringify(user));
      localStorage.setItem('lrm_locale', locale);
    }, { user, locale });
    const now = Date.now();
    const paymentDueAt = new Date(now + 720000).toISOString();
    const booking = { id: 'transfer-booking', requestedById: user.id, title: 'Equipment session', status: 'PENDING_APPROVAL',
      startAt: new Date(now + 86400000).toISOString(), endAt: new Date(now + 90000000).toISOString(),
      paymentDueAt, feeAmountVnd: 50000, resource: { code: 'LAB-01', name: 'Test equipment' } };
    let charge = { id: 'transfer-payment', userId: user.id, provider: 'unselected', status: 'pending',
      amount: 50000, txnRef: 'TRANSFER-FIXTURE', reconciliationStatus: 'none' };
    const qrUrl = 'https://vietqr.app/img?fixture=1';
    const vietqr = { qrUrl, bank: 'Vietcombank', accountNumber: '000000000000',
      accountName: 'TEST FIXTURE ONLY', amount: 50000, content: 'SEVQR LRM01234567890123456789' };
    let writes = 0;
    await context.route(qrUrl, route => route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="30" y="100">QR fixture</text></svg>'
    }));
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path === '/api/auth/me') data = user;
      else if (['/api/auth/session','/api/auth/activity'].includes(path)) data = { idleExpiresAt: new Date(now+3600000).toISOString(), expiresAt: new Date(now+7200000).toISOString(), idleTimeoutSeconds: 3600 };
      else if (path === '/api/bookings/transfer-booking') data = booking;
      else if (path === '/api/payments/booking/transfer-booking') data = [charge];
      else if (path === '/api/payments/my') data = { transactions: [charge], providers: { vnpay: true, vietqr: true } };
      else if (path === '/api/payments/transfer-payment/vietqr') {
        writes++;
        assert.equal(route.request().method(), 'POST');
        charge = { ...charge, provider: 'vietqr', paymentUrlExpiresAt: paymentDueAt };
        data = { transaction: charge, vietqr };
      } else if (path === '/api/payments/transfer-payment/receipt') {
        assert.equal(charge.status, 'success');
        data = { transaction: { ...charge, user, booking }, generatedAt: new Date().toISOString() };
      }
      await route.fulfill({ json: data });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/workspace/payments?booking=transfer-booking');
    const option = page.getByRole('button', { name: locale === 'vi' ? 'Chuyển khoản VietQR' : 'Bank transfer via VietQR' });
    await option.click();
    await page.locator('.bank-transfer-details').getByText(vietqr.content, { exact: false }).first().waitFor();
    assert.equal(await page.locator('.payment-qr').getAttribute('src'), qrUrl);
    assert.equal(await page.locator('.booking-checkout-payment .primary-button').isDisabled(), true);
    assert.equal(await page.locator('.payment-receipt').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.bank-transfer-details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/checkout-vietqr-${width}.png` });

    booking.status = 'CONFIRMED';
    charge = { ...charge, status: 'success', paidAt: new Date().toISOString() };
    await page.locator('.bank-transfer-details').waitFor({ state: 'hidden', timeout: 20000 });
    await page.getByRole('button', { name: locale === 'vi' ? 'Mở biên nhận' : 'Open receipt', exact: true }).click();
    await page.locator('.payment-receipt').getByText('VietQR', { exact: true }).waitFor();
    assert.equal(writes, 1);
    assert.deepEqual(errors, []);
    results.push({ scenario: `checkout-vietqr-${locale}`, passed: true });
    await context.close();
  }
  for (const scenario of ['verified-return', 'pending-return', 'failed-return', 'private-return']) {
    const mobile = ['pending-return', 'private-return'].includes(scenario);
    const context = await browser.newContext({viewport:{width:mobile?390:1440,height:960},reducedMotion:'reduce'});
    await context.addInitScript(({user,mobile}) => {
      sessionStorage.setItem('lrm_token','isolated-return');
      sessionStorage.setItem('lrm_user',JSON.stringify(user));
      localStorage.setItem('lrm_locale',mobile?'en':'vi');
    }, {user,mobile});
    const provider = 'vnpay';
    const providerName = 'VNPAY';
    const waiting = scenario === 'pending-return';
    let paymentStatus = waiting?'pending':scenario==='failed-return'?'failed':'success';
    let receiptReads = 0;
    const receipt = {
      generatedAt:new Date().toISOString(),
      transaction:{id:'returned-payment',txnRef:'RETURN-EXACT',amount:160000,currency:'VND',provider,
        status:'success',paidAt:new Date().toISOString(),reconciliationStatus:'none',user,
        booking:{id:'returned-booking',bookingCode:'LAB-RETURN',title:'LAB session',status:'CONFIRMED',resource:{name:'Test equipment'}}}
    };
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path==='/api/auth/me') data=user;
      else if (['/api/auth/session','/api/auth/activity'].includes(path)) data={idleExpiresAt:new Date(Date.now()+3600000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),idleTimeoutSeconds:3600};
      else if (path==='/api/payments/returned-payment') {
        if (scenario==='private-return') return route.fulfill({status:404,json:{error:{code:'NOT_FOUND'}}});
        data={...receipt.transaction,status:paymentStatus};
      } else if (path==='/api/payments/returned-payment/receipt') {
        receiptReads++;
        assert.equal(paymentStatus,'success');
        data=receipt;
      } else if (!path.startsWith('/api/auth/') && route.request().method()!=='GET') {
        throw new Error('Unexpected payment write');
      }
      await route.fulfill({json:data});
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/workspace/payments?booking=returned-booking&receipt=returned-payment&returned=1');
    await page.locator('.payment-receipt-page').waitFor();
    if (waiting) {
      await page.getByText(new RegExp('waiting for confirmation from ' + providerName)).waitFor();
      assert.equal(await page.locator('.payment-receipt').count(),0);
      assert.equal(receiptReads,0);
      paymentStatus='success';
    }
    if (scenario==='verified-return' || waiting) {
      await page.locator('.payment-receipt').waitFor();
      assert.match(await page.locator('.payment-receipt').innerText(),/RETURN-EXACT/);
      assert.ok((await page.locator('.payment-receipt .receipt-total').innerText()).includes(providerName));
      assert.equal(await page.locator('.booking-checkout,.payment-ledger').count(),0);
      assert.equal(receiptReads,1);
      await page.screenshot({path:`${output}/${scenario}.png`});
      await page.emulateMedia({media:'print'});
      assert.ok(await page.locator('.receipt-disclaimer').isVisible());
      assert.equal(await page.locator('.payment-receipt-actions').isVisible(),false);
    } else {
      await page.locator('.payment-receipt-status .alert').waitFor();
      assert.equal(receiptReads,0);
      assert.equal(await page.locator('.payment-receipt').count(),0);
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    results.push({scenario,passed:true});
    await context.close();
  }
  console.log(JSON.stringify({results,scope:'Isolated checkout fixtures; no live payments'}));
} finally {await browser.close();}
