import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { emailConfiguration, sendEmail, verifyEmailTransport } from "../src/services/emailService.js";

const token = "a".repeat(64);
const endpoint = "https://script.google.com/macros/s/LAB_EXAMPLE/exec";
const source = readFileSync(new URL("../../ops/google-apps-script/Code.gs", import.meta.url), "utf8");

function relay() {
  const sent = [];
  const scripts = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => token }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (body) => ({ setMimeType: (mime) => ({ body, mime }) })
    },
    MailApp: { getRemainingDailyQuota: () => 1, sendEmail: (email) => sent.push(email) }
  };
  const doPost = runInNewContext(source + "\ndoPost", scripts);
  return { sent, handle: (contents) => doPost({ postData: { contents } }) };
}

test("Apps Script transport verifies without sending, then sends one recipient through the Google redirect", async (t) => {
  const original = process.env;
  process.env = {
    ...original, EMAIL_TRANSPORT: "google_script", EMAIL_FROM: "demo@example.org",
    GOOGLE_SCRIPT_MAIL_URL: endpoint, GOOGLE_SCRIPT_MAIL_TOKEN: token
  };
  t.after(() => { process.env = original; });
  const { handle, sent } = relay();
  const resultUrl = "https://script.googleusercontent.com/macros/echo?opaque=fixture";
  let response;
  const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.href === endpoint) {
      assert.equal(options.redirect, "manual");
      assert.equal(options.method, "POST");
      response = handle(options.body);
      return new Response(null, { status: 302, headers: { location: resultUrl } });
    }
    assert.equal(url.href, resultUrl);
    assert.equal(options.body, undefined);
    return new Response(response.body, { headers: { "Content-Type": response.mime } });
  });
  assert.equal(emailConfiguration().configured, true);
  assert.deepEqual(await verifyEmailTransport(), { success: true });
  assert.equal(sent.length, 0);
  assert.deepEqual(await sendEmail({ to: "qa@example.org", subject: "LAB", text: "OTP fixture" }),
    { success: true, messageId: undefined });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, "OTP fixture");
  assert.equal(mock.mock.callCount(), 4);
});

test("relay rejects incorrect tokens and multiple recipients without sending", () => {
  const { handle, sent } = relay();
  const message = { to: "qa@example.org,other@example.org", subject: "LAB", text: "Fixture" };
  const send = (value) => JSON.parse(handle(JSON.stringify({ token: value, operation: "send", message })).body);
  assert.equal(send("b".repeat(64)).error, "UNAUTHORIZED");
  assert.equal(send(token).error, "INVALID_MESSAGE");
  assert.equal(sent.length, 0);
});
