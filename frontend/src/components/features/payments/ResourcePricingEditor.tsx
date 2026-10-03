import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../../api.js";

const purposes = { STUDY: "ui.study_practice_4937f9c0", TEACHING: "ui.teaching_9f674f2f", RESEARCH: "ui.research_8b814571", SERVICE: "ui.external_service_bfa35139" };
export function ResourcePricingEditor() {
  const { tr } = useLocale();
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
      setNotice("ui.pricing_saved_existing_booking_fee_977d17c3");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <details className="panel payment-charge"><summary>{translate("ui.resource_pricing_by_purpose_b8e96e61")}</summary>
    <p>{translate("ui.applies_to_internal_and_external_3039230a")}</p>
    {error && <p role="alert">{translate(error)}</p>}{notice && <p role="status">{translate(notice)}</p>}
    <form onSubmit={save} className="booking-form">
      <label>{tr("ui.resource_9a35ef53")}<select aria-label={translate("ui.chargeable_resource_4b757486")} required value={resourceId} onChange={e => setResourceId(e.target.value)}><option value="">{tr("ui.select_a_resource_8849f4e1")}</option>{resources.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}</select></label>
      <label>{tr("ui.pricing_purpose_f1a0b490")}<select value={purposeCode} onChange={e => setPurposeCode(e.target.value)}>{Object.entries(purposes).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label>{translate("ui.vnd_per_hour_dbe020c0")}<input required type="number" min="0" max="100000000" step="1" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <button className="btn btn-primary" disabled={busy || !resourceId}>{busy ? tr("ui.saving_18c4cf71") : translate("ui.save_rates_6acc633e")}</button>
    </form>
    <ul>{rules.map(rule => <li key={rule.id}>{rule.label}: {rule.hourlyRateVnd.toLocaleString("vi-VN")}  {translate("ui.vnd_hour_version_44e8cdd0")} {rule.version}</li>)}</ul>
  </details>;
}
