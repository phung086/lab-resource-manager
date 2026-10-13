import React from "react";
import { useLocale } from "../providers/LocaleProvider";
export type TariffResource = { id: string; name: string; code: string; maxBookingMinutes?: number | null; rental?: { hourlyRateVnd: number } | null };
export function ResourceTariffTable({ resources, onSelect }: { resources: TariffResource[]; onSelect: (resource: TariffResource) => void }) {
  const { tr, locale } = useLocale();
  return <div className="table-wrap rental-tariff"><table><caption>{tr("ui.rental.pricing")}</caption><thead><tr><th>{tr("ui.care.resource")}</th><th>{tr("ui.rental.hourlyPrice")}</th><th>{tr("ui.rental.maxDuration")}</th><th aria-label={tr("ui.rental.choose")}></th></tr></thead><tbody>{resources.map(resource => <tr key={resource.id}>
    <td><strong>{resource.name}</strong></td><td>{resource.rental ? new Intl.NumberFormat(locale).format(resource.rental.hourlyRateVnd) + " ₫" : "—"}</td><td>{resource.maxBookingMinutes ? resource.maxBookingMinutes / 60 + " " + tr("ui.rental.hours") : "—"}</td><td><button type="button" onClick={() => onSelect(resource)}>{tr("ui.rental.choose")}</button></td>
  </tr>)}</tbody></table></div>;
}
