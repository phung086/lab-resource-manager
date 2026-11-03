import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderEmailDocument } from '../src/services/emailTemplate.js';
import { renderAutomatedEmail } from '../src/services/emailAutomationService.js';

test('email document escapes user content and omits unsafe action links', () => {
  const html = renderEmailDocument({ title:'<img src=x>', paragraphs:['<script>bad()</script>'], fields:[['Name','<b>Guest</b>']], link:'javascript:alert(1)', linkLabel:'Open', code:'000000' });
  assert.doesNotMatch(html, /<script>|<img src=x>|href="javascript:/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;b&gt;Guest/);
  assert.match(html, /000000/);
  assert.match(html, /role="presentation"/);
  assert.match(html, /scope="row"/);
});

test('welcome and settled receipt preserve locale, reconciliation and direct destination', () => {
  const original = process.env.EMAIL_APP_URL;
  process.env.EMAIL_APP_URL='https://lab.example.test';
  try {
    for (const locale of ['vi','en']) {
      const welcome=renderAutomatedEmail({kind:'ACCOUNT_REGISTERED',locale,payload:{name:'Preview Guest',email:'preview@example.test',requiresPasswordSetup:false}});
      assert.match(welcome.html, /https:\/\/lab\.example\.test\/login/);
      assert.match(welcome.html, new RegExp(`lang="${locale}"`));
      const receipt=renderAutomatedEmail({kind:'PAYMENT_RECEIPT',locale,payload:{name:'Preview Guest',txnRef:'PREVIEW-REF',amount:240000,currency:'VND',provider:'vnpay',transactionNo:'PREVIEW-BANK',paidAt:'2026-10-29T08:35:00Z',reconciliationRequired:true,booking:{id:'preview-booking',code:'PREVIEW-LAB',title:'Preview booking',status:'CANCELLED',resource:'Preview GPU',resourceCode:'PREVIEW-GPU',laboratory:'Preview LAB',startAt:'2026-10-30T02:00:00Z',endAt:'2026-10-30T04:00:00Z'}}});
      assert.match(receipt.html, /workspace\/payments\?booking=preview-booking/);
      assert.match(receipt.text, /15:35/);
      assert.match(receipt.text, /UTC\+7/);
      assert.match(receipt.text, locale==='vi' ? /Đã hủy/ : /Cancelled/);
      assert.match(receipt.text, locale==='vi' ? /đối soát/ : /reconciliation/i);
      assert.match(receipt.html, /#fff1d6/);
      if(process.env.EMAIL_PREVIEW_DIR) {
        mkdirSync(process.env.EMAIL_PREVIEW_DIR,{recursive:true});
        writeFileSync(join(process.env.EMAIL_PREVIEW_DIR,`welcome-${locale}.html`),welcome.html);
        writeFileSync(join(process.env.EMAIL_PREVIEW_DIR,`receipt-review-${locale}.html`),receipt.html);
        writeFileSync(join(process.env.EMAIL_PREVIEW_DIR,`otp-${locale}.html`),renderEmailDocument({locale,title:locale==='vi'?'Xác thực đổi mật khẩu':'Password verification',paragraphs:[locale==='vi'?'Mẫu kiểm thử. Mã minh họa, không có giá trị sử dụng.':'Test preview. This example code cannot be used.'],code:'000000'}));
      }
    }
  } finally { if(original===undefined)delete process.env.EMAIL_APP_URL;else process.env.EMAIL_APP_URL=original; }
});
