// Script Properties must contain the same 64-character token as Railway.
function authorizeMail() {
  MailApp.getRemainingDailyQuota();
}

function doPost(e) {
  const reply = (operation, ok, error) => ContentService
    .createTextOutput(JSON.stringify({ service: "lab-mail-v1", operation, ok, error }))
    .setMimeType(ContentService.MimeType.JSON);
  const contents = e?.postData?.contents;
  if (!contents || contents.length > 160000) return reply(null, false, "INVALID_MESSAGE");

  let request;
  try { request = JSON.parse(contents); } catch { return reply(null, false, "INVALID_MESSAGE"); }
  const operation = request?.operation;
  const expected = PropertiesService.getScriptProperties().getProperty("LAB_MAIL_TOKEN");
  if (!/^[a-f0-9]{64}$/.test(expected ?? "") ||
      typeof request?.token !== "string" || request.token.length !== expected.length) {
    return reply(operation, false, "UNAUTHORIZED");
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ request.token.charCodeAt(i);
  }
  if (mismatch) return reply(operation, false, "UNAUTHORIZED");

  if (operation === "send") {
    const { to, subject, text, html } = request.message || {};
    if (typeof to !== "string" || to.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to) ||
        typeof subject !== "string" || !subject || subject.length > 512 || /[\r\n]/.test(subject) ||
        typeof text !== "string" || !text || text.length > 20000 ||
        (html !== undefined && (typeof html !== "string" || html.length > 100000))) {
      return reply(operation, false, "INVALID_MESSAGE");
    }
    try {
      if (MailApp.getRemainingDailyQuota() < 1) return reply(operation, false, "QUOTA_EXHAUSTED");
      MailApp.sendEmail({ to, subject, body: text, ...(html ? { htmlBody: html } : {}) });
      return reply(operation, true);
    } catch { return reply(operation, false, "SEND_FAILED"); }
  }
  if (operation === "verify") {
    try {
      return MailApp.getRemainingDailyQuota() > 0
        ? reply(operation, true)
        : reply(operation, false, "QUOTA_EXHAUSTED");
    } catch { return reply(operation, false, "SEND_FAILED"); }
  }
  return reply(operation, false, "INVALID_MESSAGE");
}
