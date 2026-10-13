import React, { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { useLocale } from "../providers/LocaleProvider";

type PricingRule = { id: string; purposeCode: string; label: string; hourlyRateVnd: number };
export function ResourcePricingSummary({ resourceId }: { resourceId: string }) {
  const { tr, locale } = useLocale();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setRules([]);
    apiRequest(`/booking-pricing/${resourceId}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setRules(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || "api.API_REQUEST_FAILED"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resourceId, revision]);
  if (loading) return <p role="status">{tr("ui.loading_148ded83")}</p>;
  if (error) return <div role="alert"><p>{tr(error)}</p><button type="button" className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>{tr("ui.retry_c58d068c")}</button></div>;
  const prices = [...new Set(rules.map(rule => rule.hourlyRateVnd))];
  if (prices.length === 1) return <div className="rental-price"><strong>{new Intl.NumberFormat(locale).format(prices[0])} ₫</strong><span>/ {tr("ui.rental.hour")}</span></div>;
  return <>
    {rules.length ? <dl className="resource-pricing-rules">{rules.map(rule => <div key={rule.id}>
      <dt>{rule.label || rule.purposeCode}<small>{rule.purposeCode}</small></dt>
      <dd>{new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(rule.hourlyRateVnd)}<small>{tr("ui.catalogue.perHour")}</small></dd>
    </div>)}</dl> : <p className="resource-detail-empty">{tr("ui.catalogue.noPricing")}</p>}
  </>;
}
