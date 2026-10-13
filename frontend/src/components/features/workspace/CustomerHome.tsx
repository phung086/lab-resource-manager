import React, { useState } from "react";
import { ArrowRight, CalendarDays, Clock3, DoorOpen, FlaskConical, Microscope, Search, AlertTriangle } from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { EmptyState, NextBooking, SectionTitle } from "./HomeComponents";
import { ownBookings, upcomingBookings } from "./homeSelectors";
import type { RoleHomeProps } from "./homeTypes";

const categories = [
  { value: "ROOM", label: "ui.home.category.rooms", icon: DoorOpen },
  { value: "EQUIPMENT", label: "ui.home.category.equipment", icon: Microscope },
  { value: "EXPERIMENT_KIT", label: "ui.home.category.kits", icon: FlaskConical }
];

export function CustomerHome(props: RoleHomeProps) {
  const { onNavigate, onSearch, onCalendar, resources, bookingSummary, incidentSummary } = props;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const rows = ownBookings(props);
  const upcoming = upcomingBookings(rows);
  const overdue = rows.filter(row => row.status === "CHECKED_OUT" && new Date(row.endAt).getTime() < Date.now());
  const confirmedCount = bookingSummary?.byStatus.CONFIRMED ?? 0;
  const inUseCount = bookingSummary?.byStatus.CHECKED_OUT ?? 0;
  const incidentCount = incidentSummary?.open ?? 0;
  const catalogue = resources.filter(row => row.bookingState === "bookable" && categories.some(item => item.value === row.category));
  const representatives = categories.map(item => catalogue.find(row => row.category === item.value)).filter(Boolean);
  const featured = [...representatives, ...catalogue.filter(row => !representatives.some(item => item.id === row.id))].slice(0, 3);

  return <div className="workspace-container">
    <div className="workspace-header">
      <div className="workspace-title-group">
        <h2 className="workspace-title">{t("ui.home.customer.finderTitle")}</h2>
      </div>
    </div>

    <section className="home-finder" aria-label={t("ui.home.customer.finderTitle")}>
      <form className="home-finder-form" onSubmit={event => { event.preventDefault(); onSearch(query.trim(), category); }}>
        <div className="home-search-field">
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label={t("ui.home.customer.searchPlaceholder")} maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("ui.home.customer.searchPlaceholder")} />
        </div>
        <select aria-label={t("ui.home.category.all")} value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">{t("ui.home.category.all")}</option>
          {categories.map(item => <option key={item.value} value={item.value}>{t(item.label)}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">{t("ui.home.customer.search")}<ArrowRight size={18} aria-hidden="true" /></button>
      </form>
      <div className="home-category-shortcuts">
        {categories.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => onSearch("", value)}><Icon size={16} aria-hidden="true" />{t(label)}<ArrowRight size={14} aria-hidden="true" /></button>)}
      </div>
    </section>

    <div className="attention-bar">
      <button className="attention-card" onClick={() => onNavigate("bookings", { filter: "CONFIRMED" })}>
        <span className="attention-icon"><CalendarDays size={24} aria-hidden="true" /></span>
        <span className="attention-content"><span className="attention-count">{confirmedCount}</span><span className="attention-label">{t("ui.confirmed_0df7ecd4")}</span></span>
        <ArrowRight size={18} className="attention-arrow" aria-hidden="true" />
      </button>
      <button className={bookingSummary?.overdue ? "attention-card is-urgent" : "attention-card"} onClick={() => onNavigate("bookings", { filter: "CHECKED_OUT" })}>
        <span className={bookingSummary?.overdue ? "attention-icon attention-icon-danger" : "attention-icon"}><Clock3 size={24} aria-hidden="true" /></span>
        <span className="attention-content"><span className="attention-count">{inUseCount}</span><span className="attention-label">{t("ui.home.customer.inUse")}</span></span>
        <ArrowRight size={18} className="attention-arrow" aria-hidden="true" />
      </button>
      <button className="attention-card" onClick={() => onNavigate("incidents")}>
        <span className={incidentCount ? "attention-icon attention-icon-amber" : "attention-icon"}><AlertTriangle size={24} aria-hidden="true" /></span>
        <span className="attention-content"><span className="attention-count">{incidentCount}</span><span className="attention-label">{t("ui.home.customer.incidents")}</span></span>
        <ArrowRight size={18} className="attention-arrow" aria-hidden="true" />
      </button>
    </div>

    <div className="workspace-main">
      <section className="queue-panel">
        <div className="queue-header"><SectionTitle titleKey="ui.home.customer.catalogTitle" action="ui.home.customer.browseAll" onAction={() => onSearch("")} /></div>
        {featured.length ? <div className="home-resource-grid">{featured.map(row => {
          const photo = row.media?.find(item => item.kind === "IMAGE");
          const Icon = row.category === "ROOM" ? DoorOpen : row.category === "EXPERIMENT_KIT" ? FlaskConical : Microscope;
          return <article key={row.id} className="home-resource-card">
            <div className="home-resource-cover"><Icon size={36} strokeWidth={1.5} aria-hidden="true" />{photo && <img key={photo.url} src={photo.url} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}<span>{row.code}</span></div>
            <div className="home-resource-body">
              <small>{t(`enum.category.${row.category}`)}</small><h3>{row.name}</h3>
              <p>{row.laboratory?.name || t("ui.home.resource.noLab")}</p>
              <span className="home-resource-state">{t(`enum.operational.${row.operationalStatus}`)}</span>
              {row.rental && <strong>{row.rental.hourlyRateVnd.toLocaleString("vi-VN")} {t("ui.rental.perHour")}</strong>}
              <button className="home-text-button" onClick={() => onCalendar(row.id)}>{t("ui.home.openCalendar")}<ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          </article>;
        })}</div> : <EmptyState titleKey="ui.home.resource.empty" detail="ui.home.resource.emptyHint" action="ui.home.customer.browseAll" onAction={() => onSearch("")} />}
      </section>
      <div className="workspace-sidebar">
        <div className="queue-panel home-next-panel"><NextBooking booking={overdue[0] || upcoming[0]} onNavigate={onNavigate} onCalendar={() => onCalendar()} /></div>
      </div>
    </div>
  </div>;
}
