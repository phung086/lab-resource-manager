import React, { useEffect, useState } from "react";
import { apiRequest } from "../../../api.js";

const purposes = { STUDY: "Học tập / thực hành", TEACHING: "Giảng dạy", RESEARCH: "Nghiên cứu", SERVICE: "Dịch vụ / đơn vị bên ngoài" };
export function ResourcePricingEditor() {
  const [resources, setResources] = useState<any[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [rules, setRules] = useState<any[]>([]);
  const [purposeCode, setPurposeCode] = useState("STUDY");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest("/resources").then(setResources).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    let active = true;
    setRules([]); setNotice("");
    if (resourceId) apiRequest(`/booking-pricing/${encodeURIComponent(resourceId)}`).then(rows => { if (active) setRules(rows); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [resourceId]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/booking-pricing/${encodeURIComponent(resourceId)}`, { method: "PUT", body: JSON.stringify({ purposeCode, label: purposes[purposeCode as keyof typeof purposes], hourlyRateVnd: Number(rate) }) });
      setRules(await apiRequest(`/booking-pricing/${encodeURIComponent(resourceId)}`));
      setNotice("Đã lưu bảng giá. Mức phí của booking đã tạo được giữ nguyên.");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <details className="panel payment-charge"><summary>Bảng giá tài nguyên theo mục đích</summary>
    <p>Áp dụng cho cả người dùng nội bộ và bên ngoài. Tính theo số phút sử dụng đã đặt, làm tròn lên 1 đồng. Giá 0 đồng là miễn phí. Khi có bảng giá, người đặt phải chọn một mục đích đã cấu hình.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={save} className="booking-form">
      <label>Tài nguyên<select aria-label="Tài nguyên tính phí" required value={resourceId} onChange={e => setResourceId(e.target.value)}><option value="">Chọn tài nguyên</option>{resources.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}</select></label>
      <label>Mục đích tính phí<select value={purposeCode} onChange={e => setPurposeCode(e.target.value)}>{Object.entries(purposes).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label>Đơn giá VND / giờ<input required type="number" min="0" max="100000000" step="1" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <button className="btn btn-primary" disabled={busy || !resourceId}>{busy ? "Đang lưu…" : "Lưu mức phí"}</button>
    </form>
    <ul>{rules.map(rule => <li key={rule.id}>{rule.label}: {rule.hourlyRateVnd.toLocaleString("vi-VN")} đ/giờ · phiên bản {rule.version}</li>)}</ul>
  </details>;
}
