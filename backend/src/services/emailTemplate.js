import { escapeHtml } from "./emailService.js";

// Inline styles and presentation tables also work when email clients strip CSS.
export function renderEmailDocument({ locale = "vi", title, preview = title, paragraphs = [], fields = [], link, linkLabel, footer, highlight, warning = false, code }) {
  const e = escapeHtml;
  const safeLink = (() => { try { const url = new URL(link); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; } })();
  const panel = warning ? "#fff1d6" : "#eeebfc", ink = warning ? "#713c07" : "#423075";
  return `<!doctype html><html lang="${locale === "en" ? "en" : "vi"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head>
<body style="margin:0;background:#f3f2f7;font-family:Arial,Helvetica,sans-serif;color:#292d3c;line-height:1.7">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e2deed;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px;background:#ede8fb;border-top:5px solid #6040ce"><strong style="font-size:24px;color:#423075">LAB</strong><br><span style="font-size:12px;color:#5e5377">Resource Manager</span></td></tr>
<tr><td style="padding:28px"><h1 style="font-size:25px;line-height:1.35;margin:0 0 22px;color:#292438">${e(title)}</h1>
${highlight ? `<div style="padding:20px;background:${panel};border-left:5px solid ${warning ? "#ad6900" : "#6040ce"};border-radius:8px;margin:0 0 24px;color:${ink}"><span style="font-size:13px">${e(highlight.label)}</span><br><strong style="font-size:28px;line-height:1.5">${e(highlight.value)}</strong></div>` : ""}
${code ? `<div style="padding:22px;text-align:center;background:#f3f0fc;border:1px solid #cfc2ec;border-radius:10px;margin:0 0 24px;font-family:Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#423075">${e(code)}</div>` : ""}
${paragraphs.map(line => `<p style="font-size:15px;margin:0 0 18px;white-space:pre-line">${e(line)}</p>`).join("")}
${fields.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;font-size:14px">${fields.map(([label, value]) => `<tr><th scope="row" style="width:38%;font-weight:400;text-align:left;vertical-align:top;padding:12px 8px 12px 0;border-bottom:1px solid #e7e3ee;color:#635d70">${e(label)}</th><td style="padding:12px 0 12px 8px;border-bottom:1px solid #e7e3ee;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;font-weight:600">${e(value ?? "—")}</td></tr>`).join("")}</table>` : ""}
${safeLink && linkLabel ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#6040ce" style="border-radius:8px"><a href="${e(safeLink)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">${e(linkLabel)}</a></td></tr></table><p style="font-size:12px;margin:18px 0 0;color:#635d70;word-break:break-all">${e(safeLink)}</p>` : ""}
</td></tr><tr><td style="padding:20px 28px;background:#f8f7fb;border-top:1px solid #e7e3ee;font-size:12px;color:#635d70">${e(footer || "LAB Resource Manager")}</td></tr></table>
</td></tr></table></body></html>`;
}
