import { WorkspaceHero } from "./WorkspaceHero";
import { ExpandableCard } from "../../base/ExpandableCard";
import { StatusPill } from '../resources/ResourceStatusPill';
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Cpu,
  DoorOpen,
  FlaskConical,
  Headphones,
  Layers3,
  MapPin,
  Microscope,
  PackageOpen,
  Search,
  Wallet,
  CircleAlert,
} from "lucide-react";
import { useLocale } from "../../../providers/LocaleProvider";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { EmptyState, Notices, SectionTitle } from "./HomeComponents";
import { CustomerAgenda } from "./CustomerAgenda";
import { PaymentHoldNotice } from "../payments/PaymentHoldNotice";
import { resourceImageProps } from "../../../utils/resourceImage";
import { ownBookings, upcomingBookings } from "./homeSelectors";
import type { RoleHomeProps } from "./homeTypes";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "ui.home.category.rooms",
  EQUIPMENT: "ui.home.category.equipment",
  EXPERIMENT_KIT: "ui.home.category.kits",
  MACHINE: "enum.category.MACHINE",
  MATERIAL: "enum.category.MATERIAL",
};
const categoryIcon = (category?: string) =>
  category === "ROOM"
    ? DoorOpen
    : category === "MACHINE"
      ? Cpu
      : category === "EXPERIMENT_KIT"
        ? FlaskConical
        : category === "MATERIAL"
          ? PackageOpen
          : category === "EQUIPMENT"
            ? Microscope
            : Layers3;

export function CustomerHome(props: RoleHomeProps) {
  const { tr: t, locale } = useLocale();
  const {
    user,
    resources,
    bookingSummary: summary,
    onSearch,
    onNavigate,
    onCalendar,
  } = props;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const rows = ownBookings(props);
  const overdue = rows.filter(
    (row) => row.status === "CHECKED_OUT" && Date.parse(row.endAt) < Date.now(),
  );
  const holds = rows.filter(
    (row) => row.status === "PENDING_APPROVAL" && row.paymentDueAt,
  );
  const legacy = rows.filter(
    (row) => row.status === "PENDING_APPROVAL" && !row.paymentDueAt,
  );
  const upcoming = upcomingBookings(rows);
  const agenda = [...overdue, ...holds, ...upcoming, ...legacy];
  const anchor = agenda[0];
  const state = overdue.length
    ? "overdue"
    : holds.length
      ? "payment"
      : anchor?.status === "CHECKED_OUT"
        ? "in-use"
        : anchor?.status === "PENDING_APPROVAL"
          ? "review"
          : anchor
            ? "upcoming"
            : "empty";
  const featured = useMemo(
    () =>
      resources
        .filter(
          (row) =>
            row.bookingState === "bookable" &&
            row.category &&
            CATEGORY_LABELS[row.category],
        )
        .slice(0, 3),
    [resources],
  );
  const categories = Object.keys(CATEGORY_LABELS).filter((value) =>
    resources.some((row) => row.category === value),
  );
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  const dateOnly = (value: string) => new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(value));
  const date = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const metrics = [
    {
      key: "ui.hub.confirmed",
      count: summary?.byStatus.CONFIRMED,
      icon: CalendarDays,
      tone: "violet",
      filter: "CONFIRMED",
    },
    {
      key: "ui.home.customer.inUse",
      count: summary?.byStatus.CHECKED_OUT ?? (summary ? 0 : undefined),
      icon: Clock3,
      tone: "teal",
      filter: "CHECKED_OUT",
    },
    {
      key: "ui.paymentHold.pending",
      count: summary?.pendingPayment,
      icon: Wallet,
      tone: "peach",
      filter: "PENDING_PAYMENT",
    },
    {
      key: "ui.home.session.overdue",
      count: summary?.overdue,
      icon: CircleAlert,
      tone: "rose",
      filter: "CHECKED_OUT",
    },
  ];
  const openAnchor = () =>
    anchor &&
    onNavigate("bookings", {
      booking: anchor.id,
      ...(state === "payment" ? { filter: "PENDING_PAYMENT" } : {}),
    });
  return (
    <div className="customer-hub discovery-studio">
      <WorkspaceHero title={t("ui.hub.greeting", {name:user.fullName})} subtitle={date} role={user.role} onNavigate={onNavigate}/>
      <div className="hub-top-grid">
        <details className="studio-finder"><summary id="hub-search-title"><Search size={18} aria-hidden="true"/>{t("ui.hub.findResource")}</summary>
        <section className="hub-search" aria-labelledby="hub-search-title">
          <form
            className="home-finder"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch(query.trim(), category);
            }}
          >
            <label className="hub-search-input journey-finder-field">
              <span className="sr-only">
                {t("ui.home.customer.searchPlaceholder")}
              </span>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("ui.home.customer.searchPlaceholder")}
                maxLength={120}
              />
            </label>
            <label>
              <span className="sr-only">{t("ui.home.category.all")}</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">{t("ui.home.category.all")}</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {t(CATEGORY_LABELS[value])}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="hub-button hub-button-search">
              {t("ui.home.customer.search")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
        </details>
        <section
          className="hub-focus"
          data-state={state}
          data-has-session={Boolean(anchor)}
          aria-labelledby="hub-focus-title"
        >
          <div className="hub-focus-status">
            <span className="hub-status-light" aria-hidden="true" />
            {t(
              state === "overdue"
                ? "ui.home.session.overdue"
                : state === "payment"
                  ? "ui.paymentHold.pending"
                  : state === "in-use"
                    ? "ui.home.session.now"
                    : state === "review"
                      ? "ui.home.session.pending"
                      : "ui.hub.nextSession",
            )}
          </div>
          <h2 id="hub-focus-title">
            {anchor
              ? anchor.resource?.name || anchor.title
              : t("ui.hub.emptyTitle")}
          </h2>
          {anchor ? (
            <>
              <div className="hub-session-time">
                <time dateTime={anchor.startAt}>{time(anchor.startAt)}</time>
                <span>–</span>
                <time dateTime={anchor.endAt}>{time(anchor.endAt)}</time>
              </div>
              <p className="hub-session-date">
                {dateOnly(anchor.startAt)}
              </p>
              <p className="hub-session-location">
                <MapPin size={14} aria-hidden="true" />
                {anchor.resource?.laboratory?.name ||
                  t("ui.home.resource.noLab")}
                <span>{anchor.bookingCode || anchor.id}</span>
              </p>
            </>
          ) : (
            <p className="hub-empty-copy">{t("ui.home.session.emptyLede")}</p>
          )}
          {state === "overdue" && (
            <p className="hub-focus-warning">
              <CircleAlert size={17} aria-hidden="true" />
              {t("ui.home.session.overdueLede")}
            </p>
          )}
          {state === "payment" && anchor?.paymentDueAt && (
            <PaymentHoldNotice
              paymentDueAt={anchor.paymentDueAt}
              startAt={anchor.startAt}
            />
          )}
          <div className="hub-focus-actions">
            <button
              type="button"
              className="hub-button hub-button-primary"
              onClick={anchor ? openAnchor : () => onSearch("")}
            >
              {t(
                anchor
                  ? state === "payment"
                    ? "ui.home.session.pay"
                    : state === "overdue" || state === "in-use"
                      ? "ui.home.session.viewHandover"
                      : state === "review"
                        ? "ui.home.session.viewRecord"
                        : "ui.home.session.prepare"
                  : "ui.home.customer.search",
              )}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hub-button hub-button-glass"
              onClick={() => onCalendar()}
            >
              <CalendarPlus size={17} aria-hidden="true" />
              {t("ui.home.findSlot")}
            </button>
          </div>
        </section>
      </div>
      <section
        className="hub-metrics"
        aria-label={t("ui.home.customer.myBookings")}
      >
        {metrics.map(({ key, count, icon: Icon, tone, filter }) => (
          <button
            type="button"
            className={`hub-metric tone-${tone}${count && tone === "rose" ? " is-urgent" : ""}`}
            key={key}
            onClick={() => onNavigate("bookings", { filter })}
          >
            <span className="hub-metric-label">{t(key)}</span>
            <span className="hub-metric-icon">
              <Icon size={19} aria-hidden="true" />
            </span>
            <strong>{count ?? (summary ? 0 : "—")}</strong>
            <span className="hub-metric-link">
              <span className="sr-only">{t("ui.hub.viewBookings")}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </span>
          </button>
        ))}
      </section>
      <div className="hub-body-grid">
        <div className="hub-main">
          <CustomerAgenda rows={agenda} onNavigate={onNavigate} onCalendar={onCalendar} />
          <section
            className="hub-panel hub-catalog"
            aria-labelledby="hub-catalog-title"
          >
            <header className="hub-panel-heading">
              <h2 id="hub-catalog-title">
                {t("ui.home.customer.catalogTitle")}
              </h2>
              <button type="button" onClick={() => onSearch("")}>
                {t("ui.home.customer.browseAll")}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="hub-category-shortcuts">
              {categories.map((value) => {
                const Icon = categoryIcon(value);
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => onSearch("", value)}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {t(CATEGORY_LABELS[value])}
                  </button>
                );
              })}
            </div>
            {featured.length ? (
              <div className="hub-resource-grid">
                {featured.map((row) => {
                  const Icon = categoryIcon(row.category);
                  const photo = row.media?.find(
                    (item) => item.kind === "IMAGE",
                  );
                  return (
                    <article
                      className="hub-resource"
                      key={row.id}
                      data-category={row.category}
                    >
                      <div className="hub-resource-image">
                        <Icon size={44} strokeWidth={1.3} aria-hidden="true" />
                        {photo && (
                          <img
                            {...resourceImageProps(photo.url)}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                            }}
                          />
                        )}
                        <span>{t(`enum.category.${row.category}`)}</span>
                          <button className="hub-image-action"
                            type="button"
                            onClick={() => onCalendar(row.id)}
                            aria-label={t("ui.hub.resourceCalendar", {
                              name: row.name,
                            })}
                          >
                            <CalendarPlus size={17} aria-hidden="true" />
                            {t("ui.hub.book")}
                          </button>
                      </div>
                      <div className="hub-resource-copy">
                        <h3>{row.name}</h3>
                        <p>
                          {row.laboratory?.name || t("ui.home.resource.noLab")}
                        </p>
                        <small title={t('ui.physical_state_c30af32d')}><StatusPill value={row.operationalStatus} label={t(`enum.operational.${row.operationalStatus}`)} /></small>
                        <footer>
                          {row.rental && (
                            <strong>
                              {row.rental.hourlyRateVnd.toLocaleString("vi-VN")}{" "}
                              {t("ui.rental.perHour")}
                            </strong>
                          )}

                        </footer>
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
          </section>
        </div>
        <aside className="hub-aside" aria-label={t("ui.hub.updates")}>
          <Notices rows={props.notifications} onNavigate={onNavigate} />
          {props.incidents.some((row) => row.status === "OPEN") && (
            <section className="hub-incident-panel">
              <SectionTitle titleKey="ui.home.session.incidentTitle" />
              {props.incidents
                .filter((row) => row.status === "OPEN")
                .slice(0, 2)
                .map((row) => (
                  <button
                    type="button"
                    key={row.id}
                    onClick={() =>
                      onNavigate("incidents", { incident: row.id })
                    }
                  >
                    <CircleAlert size={18} aria-hidden="true" />
                    <span>{row.title}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ))}
            </section>
          )}
          <section className="hub-help">
            <span className="hub-help-icon">
              <Headphones size={27} aria-hidden="true" />
            </span>
            <h2>{t("ui.hub.helpTitle")}</h2>
            <p>{t("ui.hub.helpCopy")}</p>
            <button type="button" onClick={() => onNavigate("support")}>
              {t("ui.hub.openSupport")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
          <ExpandableCard className="hub-guide" title={t("ui.home.customer.stepsTitle")} icon={CheckCircle2} tone="violet">
            <ol>
              {[
                ["ui.home.steps.find", "ui.home.steps.findHint"],
                ["ui.home.steps.request", "ui.home.steps.requestHint"],
                ["ui.home.steps.receive", "ui.home.steps.receiveHint"],
              ].map(([title, hint]) => (
                <li key={title}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <div>
                    <strong>{t(title)}</strong>
                    <p>{t(hint)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ExpandableCard>
        </aside>
      </div>
    </div>
  );
}
