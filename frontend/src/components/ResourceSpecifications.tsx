import React from "react";
import { useLocale } from "../providers/LocaleProvider";
import { resourceSpecLabel } from "../utils/resourceSpecLabels";
import "../styles/resource-catalogue.css";

export function ResourceSpecifications({ specs }: { specs?: Record<string, unknown> }) {
  const { tr } = useLocale();
  const entries = Object.entries(specs || {}).filter(([key, value]) => !["usageGuide", "environment"].includes(key) && value != null);
  function renderValue(value: unknown, depth = 0): React.ReactNode {
    if (typeof value === "boolean") return tr(value ? "ui.catalogue.yes" : "ui.catalogue.no");
    if (value == null) return tr("ui.not_updated_ebc5a4d4");
    if (depth > 5) return <span>{JSON.stringify(value)}</span>;
    if (Array.isArray(value)) return value.length ? <ul>{value.map((item, index) => <li key={index}>{renderValue(item, depth + 1)}</li>)}</ul> : tr("ui.not_updated_ebc5a4d4");
    if (typeof value === "object") return <dl className="resource-specifications-grid">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{resourceSpecLabel(key, tr)}</dt><dd>{renderValue(item, depth + 1)}</dd></div>)}</dl>;
    return String(value);
  }
  if (!entries.length) return <p className="resource-detail-empty">{tr("ui.catalogue.specMissing")}</p>;
  return <div className="resource-specifications">{entries.map(([key, value]) => (
    key === "technical" && value && typeof value === "object" && !Array.isArray(value)
      ? <React.Fragment key={key}>{renderValue(value)}</React.Fragment>
      : <dl key={key} className="resource-specifications-grid"><div><dt>{resourceSpecLabel(key, tr)}</dt><dd>{renderValue(value)}</dd></div></dl>
  ))}</div>;
}
