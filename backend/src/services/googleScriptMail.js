export function googleScriptConfiguration() {
  const token = process.env.GOOGLE_SCRIPT_MAIL_TOKEN;
  let url;
  try { url = new URL(process.env.GOOGLE_SCRIPT_MAIL_URL); } catch { return null; }
  if (url.origin !== "https://script.google.com" || url.username || url.password ||
      !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) || url.search || url.hash ||
      !/^[a-f0-9]{64}$/.test(token ?? "")) return null;
  return { url, token };
}

export async function callGoogleScriptMail(operation, message) {
  const config = googleScriptConfiguration();
  if (!config) return { success: false, error: "GOOGLE_SCRIPT_MAIL_NOT_CONFIGURED" };

  try {
    const signal = AbortSignal.timeout(10000);
    let response = await fetch(config.url, {
      method: "POST", redirect: "manual", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.token, operation, message })
    });
    // Apps Script Content Service serves its response at a one-time URL.
    if ([302, 303].includes(response.status)) {
      const resultUrl = new URL(response.headers.get("location"));
      if (resultUrl.origin !== "https://script.googleusercontent.com" ||
          resultUrl.username || resultUrl.password || resultUrl.pathname !== "/macros/echo") {
        return { success: false, error: "GOOGLE_SCRIPT_MAIL_INVALID_RESPONSE" };
      }
      await response.body?.cancel();
      response = await fetch(resultUrl, { redirect: "error", signal });
    }
    if (!response.ok || !response.headers.get("content-type")?.startsWith("application/json")) {
      return { success: false, error: "GOOGLE_SCRIPT_MAIL_INVALID_RESPONSE" };
    }
    const result = await response.json();
    if (result?.service !== "lab-mail-v1" || result.operation !== operation) {
      return { success: false, error: "GOOGLE_SCRIPT_MAIL_INVALID_RESPONSE" };
    }
    if (result.ok === true) return { success: true };
    const allowed = ["UNAUTHORIZED", "INVALID_MESSAGE", "QUOTA_EXHAUSTED", "SEND_FAILED"];
    return { success: false, error: allowed.includes(result.error)
      ? `GOOGLE_SCRIPT_MAIL_${result.error}`
      : "GOOGLE_SCRIPT_MAIL_INVALID_RESPONSE" };
  } catch {
    return { success: false, error: "GOOGLE_SCRIPT_MAIL_REQUEST_FAILED" };
  }
}
