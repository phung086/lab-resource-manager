import React, { useId, useState } from "react";
import { LayoutGrid, List, ArrowRight } from "lucide-react";
import { useLocale } from "../providers/LocaleProvider";
import { QueuePagination } from "./base/QueuePagination";
import "../styles/resource-catalogue.css";

export type TariffResource = { id: string; name: string; code: string; maxBookingMinutes?: number | null; rental?: { hourlyRateVnd: number } | null };

const pageSize = 12;

export function ResourceTariffTable({ resources, onSelect }: { resources: TariffResource[]; onSelect: (resource: TariffResource) => void }) {
  const { tr, locale } = useLocale();
  const headingId = useId();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selection, setSelection] = useState({ resultIds: "", page: 1 });
  const total = resources.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resultIds = JSON.stringify(resources.map(resource => resource.id));
  const page = selection.resultIds === resultIds ? selection.page : 1;
  const start = (page - 1) * pageSize;
  const format = new Intl.NumberFormat(locale);

  return <section className="rental-tariff" aria-labelledby={headingId}>
    <header className="rental-tariff-header">
      <h2 id={headingId}>{tr("ui.rental.pricing")}</h2>
      {total > 0 && <div className="rental-tariff-switch" role="group" aria-label={tr("ui.rental.tariffView")}>
        <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
          <LayoutGrid size={16} aria-hidden="true" />{tr("ui.rental.tariffGrid")}
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          <List size={17} aria-hidden="true" />{tr("ui.kanban.list")}
        </button>
      </div>}
    </header>
    {totalPages > 1 && <QueuePagination label={tr("ui.rental.tariffPagination")} pagination={{ page, pageSize, total, totalPages }}
      onPage={nextPage => setSelection({ resultIds, page: nextPage })} />}
    {total === 0 ? <p className="rental-tariff-empty">{tr("ui.care.empty")}</p> :
      <ul className="rental-tariff-items" data-view={view} role="list">
        {resources.slice(start, start + pageSize).map(resource => <li key={resource.id} className="rental-tariff-item">
          <div className="rental-tariff-identity">
            <strong>{resource.name}</strong>
            <span>{resource.code}</span>
          </div>
          <dl className="rental-tariff-facts">
            <div><dt>{tr("ui.rental.hourlyPrice")}</dt>
              <dd className="rental-tariff-rate">{resource.rental ? `${format.format(resource.rental.hourlyRateVnd)} ₫` : tr("ui.rental.pricePending")}</dd>
            </div>
            <div><dt>{tr("ui.rental.maxDuration")}</dt>
              <dd>{resource.maxBookingMinutes ? `${format.format(resource.maxBookingMinutes / 60)} ${tr(resource.maxBookingMinutes === 60 ? "ui.rental.hour" : "ui.rental.hours")}` : "—"}</dd>
            </div>
          </dl>
          <button type="button" className="rental-tariff-select" onClick={() => onSelect(resource)}>
            {tr("ui.rental.choose")}<span className="sr-only"> {resource.name}</span><ArrowRight size={15} aria-hidden="true" />
          </button>
        </li>)}
      </ul>}
  </section>;
}
