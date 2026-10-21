import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Cpu,
  DoorOpen,
  FlaskConical,
  Layers3,
  MapPin,
  Microscope,
  PackageOpen,
  Search,
  Wallet
} from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { BookingStatusBadge } from "../../BookingStatusBadge";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { EmptyState, SectionTitle } from "./HomeComponents";
import { resourceImageProps } from '../../../utils/resourceImage';
import { ownBookings, upcomingBookings } from "./homeSelectors";
import type { BookingRecord } from "../../../types/booking";
import type { HomeResource, RoleHomeProps } from "./homeTypes";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "ui.home.category.rooms",
  EQUIPMENT: "ui.home.category.equipment",
  EXPERIMENT_KIT: "ui.home.category.kits",
  MACHINE: "enum.category.MACHINE",
  MATERIAL: "enum.category.MATERIAL"
};

const categoryIcon = (category?: string) => {
  if (category === "ROOM") return DoorOpen;
  if (category === "EXPERIMENT_KIT") return FlaskConical;
  if (category === "MACHINE") return Cpu;
  if (category === "MATERIAL") return PackageOpen;
  if (category === "EQUIPMENT") return Microscope;
  return Layers3;
};

const MS_HOUR = 60 * 60 * 1000;

function sessionBadge(booking: BookingRecord): { key: string; tone: "soon" | "now" | "later" } {
  const start = new Date(booking.startAt).getTime();
  const now = Date.now();
  if (booking.status === "CHECKED_OUT") return { key: "ui.home.session.now", tone: "now" };
  if (start - now < 24 * MS_HOUR) return { key: "ui.home.session.soon", tone: "soon" };
  return { key: "ui.home.session.later", tone: "later" };
}

function sessionActions(booking: BookingRecord, onNavigate: (tab: string, params?: Record<string, string>) => void) {
  if (booking.status === "CHECKED_OUT") {
    return [
      { key: "ui.home.session.viewHandover", onClick: () => onNavigate("bookings", { booking: booking.id }) },
      { key: "ui.home.session.openCalendar", onClick: () => onNavigate("smart_calendar", { resource: booking.resourceId }) }
    ];
  }
  if (booking.status === "PENDING_APPROVAL" && booking.paymentDueAt) {
    return [{ key: "ui.home.session.pay", onClick: () => onNavigate("bookings", { booking: booking.id, filter: "PENDING_PAYMENT" }) }];
  }
  if (booking.status === "CONFIRMED") {
    return [
      { key: "ui.home.session.prepare", onClick: () => onNavigate("bookings", { booking: booking.id }) }
    ];
  }
  return [{ key: "ui.home.session.viewRecord", onClick: () => onNavigate("bookings", { booking: booking.id }) }];
}

function pickFeatured(resources: HomeResource[]): HomeResource[] {
  const bookable = resources.filter(row => row.bookingState === "bookable" && row.category && CATEGORY_LABELS[row.category]);
  if (!bookable.length) return [];
  const [hero, ...rest] = bookable;
  const different = rest.filter(item => item.category !== hero.category);
  const secondary = different[0] ?? rest[0];
  const tertiary = different[1] ?? rest.find(item => item.id !== secondary?.id);
  return [hero, secondary, tertiary].filter((row): row is HomeResource => Boolean(row));
}

export function CustomerHome(props: RoleHomeProps) {
  const { onNavigate, onSearch, onCalendar, resources, bookingSummary, notifications, incidents, user } = props;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const rows = ownBookings(props);
  const upcoming = upcomingBookings(rows);
  const overdue = rows.filter(row => row.status === "CHECKED_OUT" && new Date(row.endAt).getTime() < Date.now());
  const pendingApproval = rows.filter(row => row.status === "PENDING_APPROVAL" && !row.paymentDueAt);
  const awaitingPayment = rows.filter(row => row.status === "PENDING_APPROVAL" && row.paymentDueAt);
  const rejected = rows.filter(row => row.status === "REJECTED" || row.status === "CANCELLED");

  // Single anchor: the soonest thing on the customer's calendar. Overdue wins
  // (urgency), then in-use, then earliest confirmed session. The home is
  // organised around what the customer must do next, not around count tiles.
  const anchor = overdue[0] ?? awaitingPayment[0] ?? upcoming[0] ?? pendingApproval[0] ?? null;
  const recentIncidents = incidents.filter(item => item.status === "OPEN").slice(0, 2);

  const featured = useMemo(() => pickFeatured(resources), [resources]);
  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    resources.forEach(row => row.category && CATEGORY_LABELS[row.category] && seen.add(row.category));
    return Array.from(seen);
  }, [resources]);

  const hasSomething = Boolean(anchor) || pendingApproval.length > 0 || rejected.length > 0;
  const reminderCount = bookingSummary?.pendingPayment ?? 0;

  return (
    <div className="workspace-container">
      <section className="customer-journey" aria-label={t("ui.home.customer.title")}>
        <div className="journey-hero" data-state={anchor ? (overdue[0] ? "overdue" : anchor.status === "CHECKED_OUT" ? "inUse" : "upcoming") : "empty"}>
          <div className="journey-hero-art" aria-hidden="true">
            <span className="journey-hero-art-mark">
              <FlaskConical size={36} strokeWidth={1.4} />
            </span>
          </div>
          <div className="journey-hero-copy">
            <h1 id="workspace-title" className="journey-hero-title">
              {anchor
                ? overdue[0]
                  ? t("ui.home.session.overdueTitle", { value0: anchor.resource?.name || anchor.title })
                  : anchor.status === "PENDING_APPROVAL" && anchor.paymentDueAt
                    ? t("ui.home.session.paymentTitle", { value0: anchor.resource?.name || anchor.title })
                  : anchor.status === "CHECKED_OUT"
                    ? t("ui.home.session.inUseTitle", { value0: anchor.resource?.name || anchor.title })
                    : t("ui.home.session.upcomingTitle", { value0: anchor.resource?.name || anchor.title })
                : t("ui.home.session.emptyTitle", { value0: user.fullName || user.email })}
            </h1>
            <p className="journey-hero-lede">
              {anchor
                ? t(overdue[0] ? "ui.home.session.overdueLede" : anchor.status === "PENDING_APPROVAL" && anchor.paymentDueAt ? "ui.paymentHold.rule" : anchor.status === "CHECKED_OUT" ? "ui.home.session.inUseLede" : "ui.home.session.upcomingLede")
                : t("ui.home.session.emptyLede")}
            </p>
            {anchor ? (
              <dl className="journey-hero-facts">
                <div>
                  <dt><Clock3 size={14} aria-hidden="true" />{t("ui.home.next.start")}</dt>
                  <dd><time dateTime={anchor.startAt}>{formatVietnamDateTime(anchor.startAt)}</time></dd>
                </div>
                <div>
                  <dt><Clock3 size={14} aria-hidden="true" />{t("ui.home.next.end")}</dt>
                  <dd><time dateTime={anchor.endAt}>{formatVietnamDateTime(anchor.endAt)}</time></dd>
                </div>
                {anchor.resource?.laboratory && (
                  <div>
                    <dt><MapPin size={14} aria-hidden="true" />{t("ui.home.next.location")}</dt>
                    <dd>{anchor.resource.laboratory.name}</dd>
                  </div>
                )}
                <div>
                  <dt><CalendarDays size={14} aria-hidden="true" />{t("ui.home.session.reference")}</dt>
                  <dd>{anchor.bookingCode || anchor.id.slice(0, 8).toUpperCase()}</dd>
                </div>
              </dl>
            ) : null}
            <div className="journey-hero-actions">
              {anchor
                ? sessionActions(anchor, onNavigate).map(action => (
                    <button key={action.key} type="button" className="journey-cta journey-cta-primary" onClick={action.onClick}>
                      {t(action.key)}<ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))
                : (
                    <button type="button" className="journey-cta journey-cta-primary" onClick={() => onSearch("")}>
                      {t("ui.home.customer.finderTitle")}<ArrowRight size={16} aria-hidden="true" />
                    </button>
                  )}
              <button type="button" className="journey-cta journey-cta-ghost" onClick={() => onCalendar()}>
                <CalendarPlus size={16} aria-hidden="true" />{t("ui.home.findSlot")}
              </button>
            </div>
            {anchor ? (
              <div className="journey-hero-status">
                <BookingStatusBadge status={anchor.status} paymentDueAt={anchor.paymentDueAt} />
                <span className="journey-hero-badge" data-tone={sessionBadge(anchor).tone}>
                  {t(sessionBadge(anchor).key)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {!hasSomething && reminderCount > 0 ? (
          <p className="journey-reminder" role="status">
            <Wallet size={16} aria-hidden="true" />
            {t("ui.home.session.paymentReminder", { value0: reminderCount })}
          </p>
        ) : null}

        <div className="journey-grid">
          <div className="journey-column journey-column-main">
            <SectionTitle
              titleKey="ui.home.customer.stepsTitle"
              action="ui.home.findSlot"
              onAction={() => onCalendar()}
            />
            <ol className="journey-steps" aria-label={t("ui.home.customer.stepsTitle")}>
              <li>
                <span className="journey-step-num">01</span>
                <div>
                  <strong>{t("ui.home.steps.find")}</strong>
                  <small>{t("ui.home.steps.findHint")}</small>
                </div>
                <button type="button" onClick={() => onSearch(query.trim(), category)}>
                  {t("ui.home.customer.search")}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </li>
              <li>
                <span className="journey-step-num">02</span>
                <div>
                  <strong>{t("ui.home.steps.request")}</strong>
                  <small>{t("ui.home.steps.requestHint")}</small>
                </div>
                <button type="button" onClick={() => onCalendar()}>
                  {t("ui.home.findSlot")}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </li>
              <li>
                <span className="journey-step-num">03</span>
                <div>
                  <strong>{t("ui.home.steps.receive")}</strong>
                  <small>{t("ui.home.steps.receiveHint")}</small>
                </div>
                <button type="button" onClick={() => onNavigate("bookings", { filter: "ACTIVE" })}>
                  {t("ui.home.customer.myBookings")}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </li>
            </ol>

            <SectionTitle
              titleKey="ui.home.session.timelineTitle"
              action="ui.view_all_44aeb8cb"
              onAction={() => onNavigate("bookings", { filter: "CONFIRMED" })}
            />
            {upcoming.length || overdue.length || pendingApproval.length || awaitingPayment.length ? (
              <ol className="journey-timeline" aria-label={t("ui.home.session.timelineTitle")}>
                {[...overdue, ...awaitingPayment, ...pendingApproval, ...upcoming].slice(0, 5).map((booking, index) => {
                  const badge = sessionBadge(booking);
                  const isLast = index === Math.min(4, overdue.length + awaitingPayment.length + pendingApproval.length + upcoming.length - 1);
                  return (
                    <li key={booking.id} className="journey-timeline-item" data-tone={badge.tone}>
                      <span className="journey-timeline-rail" aria-hidden="true">
                        <span className="journey-timeline-dot" />
                        {!isLast && <span className="journey-timeline-line" />}
                      </span>
                      <article className="journey-timeline-card">
                        <header>
                          <time dateTime={booking.startAt}>{formatVietnamDateTime(booking.startAt)}</time>
                          <span className="journey-timeline-badge" data-tone={badge.tone}>{t(badge.key)}</span>
                        </header>
                        <h3>{booking.resource?.name || booking.title}</h3>
                        <p>
                          {booking.resource?.laboratory ? `${booking.resource.laboratory.name} · ` : ""}
                          {booking.title}
                        </p>
                        <footer>
                          <BookingStatusBadge status={booking.status} paymentDueAt={booking.paymentDueAt} />
                          <button type="button" onClick={() => onNavigate("bookings", { booking: booking.id })}>
                            {t("ui.home.session.viewRecord")}<ArrowRight size={14} aria-hidden="true" />
                          </button>
                        </footer>
                      </article>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                titleKey="ui.home.next.empty"
                detail="ui.home.next.emptyHint"
                action="ui.home.findSlot"
                onAction={() => onCalendar()}
              />
            )}

            <SectionTitle
              titleKey="ui.home.customer.catalogTitle"
              action="ui.home.customer.browseAll"
              onAction={() => onSearch("")}
            />
            <p className="journey-section-note">{t("ui.home.customer.description")}</p>
            {featured.length ? (
              <div className="journey-catalog">
                {featured.map((row, index) => {
                  const photo = row.media?.find(item => item.kind === "IMAGE");
                  const Icon = categoryIcon(row.category);
                  const isHero = index === 0;
                  return (
                    <article key={row.id} className={`journey-catalog-card${isHero ? " is-hero" : ""}`}>
                      <div className="journey-catalog-cover">
                        {photo ? (
                          <img
                            key={photo.url}
                            {...resourceImageProps(photo.url)}
                            alt=""
                            onError={event => { event.currentTarget.hidden = true; }}
                          />
                        ) : (
                          <Icon size={isHero ? 44 : 28} strokeWidth={1.4} aria-hidden="true" />
                        )}
                        <span className="journey-catalog-code">{row.code}</span>
                      </div>
                      <div className="journey-catalog-body">
                        <small>{t(`enum.category.${row.category}`)}</small>
                        <h3>{row.name}</h3>
                        <p>{row.laboratory?.name || t("ui.home.resource.noLab")}</p>
                        <span className="journey-catalog-state">{t(`enum.operational.${row.operationalStatus}`)}</span>
                        {row.rental && (
                          <strong>
                            {row.rental.hourlyRateVnd.toLocaleString("vi-VN")} {t("ui.rental.perHour")}
                          </strong>
                        )}
                        <button type="button" className="journey-catalog-cta" onClick={() => onCalendar(row.id)}>
                          {t(isHero ? "ui.home.openCalendar" : "ui.home.customer.viewDetails")}
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                titleKey="ui.home.resource.empty"
                detail="ui.home.resource.emptyHint"
                action="ui.home.customer.browseAll"
                onAction={() => onSearch("")}
              />
            )}
          </div>

          <aside className="journey-column journey-column-side" aria-label={t("ui.home.customer.myBookings")}>
            <section className="journey-side-card">
              <h3>{t("ui.home.customer.finderTitle")}</h3>
              <p>{t("ui.home.customer.description")}</p>
              <form className="journey-finder" onSubmit={event => { event.preventDefault(); onSearch(query.trim(), category); }}>
                <label className="journey-finder-field">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={t("ui.home.customer.searchPlaceholder")}
                    aria-label={t("ui.home.customer.searchPlaceholder")}
                    maxLength={120}
                  />
                </label>
                <label className="journey-finder-select">
                  <span className="visually-hidden">{t("ui.home.category.all")}</span>
                  <select value={category} onChange={event => setCategory(event.target.value)}>
                    <option value="">{t("ui.home.category.all")}</option>
                    {availableCategories.map(value => (
                      <option key={value} value={value}>{t(CATEGORY_LABELS[value])}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="journey-cta journey-cta-primary">
                  {t("ui.home.customer.search")}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </form>
              {availableCategories.length > 0 ? (
                <div className="journey-finder-shortcuts">
                  {availableCategories.slice(0, 5).map(value => {
                    const Icon = categoryIcon(value);
                    return (
                      <button key={value} type="button" onClick={() => onSearch("", value)}>
                        <Icon size={14} aria-hidden="true" />{t(CATEGORY_LABELS[value])}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="journey-side-card" aria-labelledby="journey-side-status">
              <h3 id="journey-side-status">{t("ui.home.customer.myBookings")}</h3>
              <ul className="journey-status-list">
                <li>
                  <span className="journey-status-dot" data-tone="upcoming" aria-hidden="true" />
                  <span>
                    <strong>{upcoming.length}</strong>
                    <small>{t("ui.home.session.upcoming")}</small>
                  </span>
                  <button type="button" onClick={() => onNavigate("bookings", { filter: "CONFIRMED" })}>
                    {t("ui.view_all_44aeb8cb")}
                  </button>
                </li>
                <li>
                  <span className="journey-status-dot" data-tone="overdue" aria-hidden="true" />
                  <span>
                    <strong>{overdue.length}</strong>
                    <small>{t("ui.home.session.overdue")}</small>
                  </span>
                  <button type="button" onClick={() => onNavigate("bookings", { filter: "CHECKED_OUT" })}>
                    {t("ui.view_all_44aeb8cb")}
                  </button>
                </li>
                {pendingApproval.length > 0 && <li>
                  <span className="journey-status-dot" data-tone="pending" aria-hidden="true" />
                  <span>
                    <strong>{pendingApproval.length}</strong>
                    <small>{t("ui.home.session.pending")}</small>
                  </span>
                  <button type="button" onClick={() => onNavigate("bookings", { filter: "PENDING_APPROVAL" })}>
                    {t("ui.view_all_44aeb8cb")}
                  </button>
                </li>}
                {(bookingSummary?.pendingPayment || 0) > 0 && <li>
                  <span className="journey-status-dot" data-tone="pending" aria-hidden="true" />
                  <span><strong>{bookingSummary?.pendingPayment}</strong><small>{t("ui.paymentHold.pending")}</small></span>
                  <button type="button" onClick={() => onNavigate("bookings", { filter: "PENDING_PAYMENT" })}>{t("ui.view_all_44aeb8cb")}</button>
                </li>}
              </ul>
            </section>

            {recentIncidents.length > 0 ? (
              <section className="journey-side-card journey-side-card-warn" aria-labelledby="journey-side-incident">
                <h3 id="journey-side-incident">{t("ui.home.session.incidentTitle")}</h3>
                <ul className="journey-incident-list">
                  {recentIncidents.map(item => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      {item.resource?.name ? <small>{item.resource.name}</small> : null}
                      <button type="button" onClick={() => onNavigate("incidents", { incident: String(item.id) })}>
                        {t("ui.home.session.viewRecord")}<ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {notifications.length ? (
              <p className="journey-side-note">
                <CheckCircle2 size={14} aria-hidden="true" />
                {t("ui.home.session.helpHint")}
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
