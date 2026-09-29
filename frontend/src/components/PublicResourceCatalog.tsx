import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  Info,
  Microscope,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { apiRequest } from "../api.js";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import { GuestQuickBookingPanel } from "./GuestQuickBookingPanel";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { formatVietnamDateTime } from "../utils/timezone";
import "../styles/public-catalog.css";

type Media = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  title: string;
  altText: string;
  sourceUrl?: string;
  credit?: string;
  license?: string;
};

type TrainingReq = {
  id: string;
  courseId: string;
  code?: string;
  name?: string;
};

type Resource = {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  location: string;
  capacity: number;
  bookingState: string;
  operationalStatus: string;
  media?: Media[];
  laboratory?: {
    name: string;
    labPolicy?: {
      requiresApproval?: boolean;
      maxBookingMinutes?: number;
      minBookingMinutes?: number;
      maxAdvanceBookingDays?: number;
      allowWeekend?: boolean;
      workDayStartHour?: number;
      workDayEndHour?: number;
    };
  };
  effectiveRequiresApproval: boolean;
  trainingRequirements?: TrainingReq[];
  manufacturer?: string;
  model?: string;
};

type ScheduleBlock = { id: string; status?: string; kind?: string; title?: string; startAt: string; endAt: string };
type SchedulePayload = { bookings: ScheduleBlock[]; maintenanceWindows: ScheduleBlock[] };

const categoryLabels: Record<string, string> = {
  ROOM: "Phòng LAB",
  EQUIPMENT: "Thiết bị",
  MACHINE: "Máy móc",
  EXPERIMENT_KIT: "Bộ thí nghiệm",
  MATERIAL: "Vật tư"
};

const operationalBadgeLabels: Record<string, { label: string; class: string }> = {
  AVAILABLE: { label: "Khả dụng", class: "badge-op-available" },
  IN_USE: { label: "Đang sử dụng", class: "badge-op-inuse" },
  MAINTENANCE: { label: "Bảo trì", class: "badge-op-maintenance" },
  CALIBRATION: { label: "Hiệu chuẩn", class: "badge-op-calibration" },
  BROKEN: { label: "Hỏng hóc", class: "badge-op-broken" },
  RETIRED: { label: "Ngừng sử dụng", class: "badge-op-retired" },
  OFFLINE: { label: "Ngoại tuyến", class: "badge-op-offline" }
};

const bookingBlockStatuses = new Set(["PENDING_APPROVAL", "CONFIRMED", "CHECKED_OUT", "RETURNED"]);

function formatRange(startAt: string, endAt: string) {
  return `${formatVietnamDateTime(startAt)} – ${formatVietnamDateTime(endAt)}`;
}

export function PublicResourceCatalog({
  onViewSchedule,
  onGuestBookingComplete
}: {
  onViewSchedule: (id: string) => void;
  onGuestBookingComplete?: (result: any) => void;
}) {
  const { tr, t } = useLocale();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef(0);
  const detailOpener = useRef<HTMLElement | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => { detailRequest.current += 1; }, []);

  // Authenticated user state if present
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lrm_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest("/resources")
      .then((rows: Resource[]) => {
        if (active) {
          setResources(
            rows.filter(
              (row) =>
                ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"].includes(row.category || "") &&
                row.operationalStatus !== "RETIRED"
            )
          );
        }
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message || tr("Không tải được danh mục tài nguyên."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, tr]);

  const categoryOrder = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"];
  const matches = resources.filter(row => (filter === "ALL" || row.category === filter) && `${row.name} ${row.code} ${row.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => categoryOrder.indexOf(a.category || "") - categoryOrder.indexOf(b.category || "") || a.code.localeCompare(b.code));
  const visible = matches.slice(0, limit);

  async function openDetails(row: Resource, rememberOpener = true) {
    const request = ++detailRequest.current;
    if (rememberOpener) detailOpener.current = document.activeElement as HTMLElement;
    setSelected(row);
    setDetailLoading(true);
    setDetailError("");
    setSchedule(null);
    setScheduleError("");
    setScheduleLoading(true);
    requestAnimationFrame(() => {
      if (request !== detailRequest.current) return;
      detailHeading.current?.focus({ preventScroll: true });
      document.getElementById("chi-tiet-tai-nguyen")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    });
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [detailResult, scheduleResult] = await Promise.allSettled([
      apiRequest(`/resources/${encodeURIComponent(row.id)}`),
      apiRequest(
        `/resources/${encodeURIComponent(row.id)}/schedule?from=${encodeURIComponent(
          now.toISOString()
        )}&to=${encodeURIComponent(end.toISOString())}`
      )
    ]);
    if (request !== detailRequest.current) return;
    if (detailResult.status === "fulfilled") setSelected(detailResult.value);
    else setDetailError(tr("Chưa tải được điều kiện sử dụng. Vui lòng thử lại trước khi đặt lịch."));
    if (scheduleResult.status === "fulfilled") setSchedule(scheduleResult.value);
    if (scheduleResult.status === "rejected") setScheduleError(tr("Chưa tải được lịch bận của tài nguyên này."));
    setScheduleLoading(false);
    setDetailLoading(false);
  }

  function closeDetails() {
    detailRequest.current += 1;
    setSelected(null);
    detailOpener.current?.focus();
  }

  const busyBookings = (schedule?.bookings || [])
    .filter((row) => row.status && bookingBlockStatuses.has(row.status));
  const busyMaintenance = (schedule?.maintenanceWindows || [])
    .filter((row) => row.status === "scheduled" || row.status === "in_progress");

  // Compute eligibility verdict for selected resource
  function computeEligibility(resource: Resource) {
    const isPhysicalOk = ["AVAILABLE", "IN_USE"].includes(resource.operationalStatus);
    if (!isPhysicalOk) {
      return {
        status: "UNAVAILABLE",
        label: tr("Tạm ngưng phục vụ"),
        message: t('Tài nguyên tạm thời không nhận lịch mới. Kiểm tra trạng thái thiết bị hoặc liên hệ cán bộ LAB.', 'This resource is not accepting new bookings. Check its physical status or contact LAB staff.'),
        type: "danger"
      };
    }

    const trainingList = resource.trainingRequirements || [];
    if (trainingList.length === 0) {
      return {
        status: "ELIGIBLE",
        label: tr("Đủ điều kiện"),
        message: tr("Tài nguyên không yêu cầu chứng chỉ an toàn tiên quyết."),
        type: "success"
      };
    }

    if (!currentUser) {
      return {
        status: "AUTH_REQUIRED",
        label: tr("Cần chứng nhận an toàn"),
        message: t('Yêu cầu hoàn thành: ', 'Required training: ') + trainingList.map(item => item.name || item.code).join(', ') + t('. Tài khoản phải có chứng chỉ còn hiệu lực trước khi đặt lịch; OTP không thay thế điều kiện này.', '. Your account must hold valid certifications before booking; OTP does not replace this requirement.'),
        type: "info"
      };
    }

    return {
      status: "TRAINING_REQUIRED",
      label: t('Cần kiểm tra chứng nhận', 'Certification check required'),
      message: t('Yêu cầu: ', 'Required: ') + trainingList.map(item => item.name || item.code).join(', ') + t('. Hệ thống kiểm tra chứng chỉ còn hiệu lực khi gửi lịch đặt.', '. Valid certifications are verified when you submit a booking.'),
      type: "info"
    };
  }

  return (
    <div className="public-live-catalog">
      <div className="catalog-head">
        <div>
          <h3>{tr("Khám phá phòng và thiết bị LAB")}</h3>
          <p>
            {tr("Danh mục tài nguyên từ hệ thống. Tra cứu trạng thái vận hành, điều kiện sử dụng và lịch khả dụng trước khi đặt.")}</p>
        </div>
        <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label={tr("Tải lại danh mục")}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <label className="catalog-search-label">{t('Tìm phòng hoặc thiết bị', 'Find a room or equipment')}<input type="search" value={search} maxLength={120} onChange={event => { setSearch(event.target.value); setLimit(6); }} placeholder={t('Tên, mã tài nguyên hoặc vị trí', 'Name, resource code or location')} /></label>
      <div className="catalog-filters" role="group" aria-label={tr("Lọc tài nguyên")}>
        {[
          ["ALL", tr("Tất cả")],
          ["ROOM", tr("Phòng LAB")],
          ["EQUIPMENT", tr("Thiết bị")],
          ["MACHINE", tr("Máy móc")],
          ["EXPERIMENT_KIT", tr("Bộ thí nghiệm")],
          ["MATERIAL", tr("Vật tư")]
        ].map(([code, label]) => (
          <button
            key={code}
            type="button"
            aria-pressed={filter === code}
            onClick={() => { setFilter(code); setLimit(6); }}
          >
            {tr(label)}
          </button>
        ))}
      </div>

      {loading && <p role="status">{tr("Đang tải danh mục phòng và thiết bị…")}</p>}
      {error && (
        <div className="catalog-message" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            {tr("Thử lại")}</button>
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <p className="catalog-message">{tr("Chưa có tài nguyên trong nhóm này.")}</p>
      )}

      {/* Catalog Cards Grid */}
      <div className="catalog-grid">
        {visible.map((row) => {
          const image = row.media?.find((item) => item.kind === "IMAGE");
          const opBadge = operationalBadgeLabels[row.operationalStatus] || {
            label: row.operationalStatus,
            class: "badge-op-other"
          };
          return (
            <article key={row.id} className="catalog-card">
              <button
                type="button"
                className="catalog-cover"
                onClick={() => void openDetails(row)}
                aria-label={`${t('Xem chi tiết', 'View details')}: ${row.name}`}
              >
                {image ? (
                  <ResourceMediaPreview key={image.url} kind="IMAGE" url={image.url} alt={image.altText || row.name} />
                ) : (
                  <span className="catalog-placeholder">
                    {row.category === "ROOM" ? <DoorOpen size={48} /> : <Microscope size={48} />}
                    <small>{tr("Chưa có ảnh minh họa")}</small>
                  </span>
                )}
              </button>

              <div className="catalog-card-body">
                {/* LAB-oriented Status Badges */}
                <div className="catalog-card-badges">
                  <span className={`card-badge ${opBadge.class}`}>{tr(opBadge.label)}</span>
                  <span className="card-badge badge-approval">
                    {row.effectiveRequiresApproval ? tr("Cần duyệt") : tr("Tự động")}
                  </span>
                  {row.trainingRequirements && row.trainingRequirements.length > 0 && (
                    <span className="card-badge badge-training">{tr("Cần chứng chỉ")}</span>
                  )}
                </div>

                <span className="catalog-card-meta">
                  {tr(categoryLabels[row.category || ""] || row.category || "")} · {row.code}
                </span>
                <h4>{row.name}</h4>
                <p className="catalog-card-loc">{row.location}</p>

                {/* Primary CTA */}
                <button
                  type="button"
                  className="catalog-card-cta"
                  onClick={() => void openDetails(row)}
                >
                  {tr("Xem lịch & đặt")}<ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && matches.length > limit && <button type="button" className="public-secondary catalog-show-more" onClick={() => setLimit(value => value + 6)}>{t('Xem thêm tài nguyên', 'Show more resources')} ({matches.length - limit})</button>}
      {/* Resource Detail Section */}
      {selected && (
        <section className="catalog-detail" id="chi-tiet-tai-nguyen" aria-labelledby="catalog-detail-title">
          <div className="catalog-detail-heading">
            <div>
              <span>
                {tr(categoryLabels[selected.category || ""])} · {selected.code}
              </span>
              <h3 id="catalog-detail-title" ref={detailHeading} tabIndex={-1}>{selected.name}</h3>
              <p>{selected.laboratory?.name || selected.location}</p>
            </div>
            <button type="button" onClick={closeDetails} aria-label={tr("Đóng chi tiết")}>
              {tr("Đóng")}</button>
          </div>

          {detailLoading ? (
            <p role="status">{tr("Đang kiểm tra thông tin và điều kiện sử dụng…")}</p>
          ) : detailError ? (
            <div className="catalog-message" role="alert">
              {detailError}{" "}
              <button type="button" onClick={() => void openDetails(selected, false)}>{tr("Thử lại")}</button>
            </div>
          ) : null}

          <div className="catalog-detail-layout">
            <div className="catalog-media-gallery">
              {selected.media?.length ? (
                selected.media.map((item) => (
                  <figure key={item.id}>
                    <ResourceMediaPreview
                      key={item.url}
                      kind={item.kind}
                      url={item.url}
                      alt={item.altText || item.title || selected.name}
                    />
                    <figcaption>
                      <strong>{item.title}</strong>
                      <span>
                        {tr("Tư liệu minh họa ·")}{item.credit || tr("Nguồn do quản trị viên cung cấp")}{" "}
                        {item.license && `· ${item.license}`}
                      </span>
                      {item.sourceUrl && (
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {tr("Xem nguồn")}</a>
                      )}
                    </figcaption>
                  </figure>
                ))
              ) : (
                <div className="catalog-no-media">
                  <Play size={34} aria-hidden="true" />
                  <p>{tr("Chưa có ảnh hoặc video được xác minh nguồn cho tài nguyên này.")}</p>
                </div>
              )}
            </div>

            <div className="catalog-facts">
              {/* Eligibility First Card: Answers "Tôi có thể sử dụng tài nguyên này không?" */}
              {(() => {
                const verdict = computeEligibility(selected);
                return (
                  <div className={`catalog-eligibility-verdict verdict-${verdict.type}`}>
                    <div className="verdict-header">
                      {verdict.type === "success" ? (
                        <CheckCircle2 size={18} aria-hidden="true" />
                      ) : verdict.type === "warning" ? (
                        <ShieldAlert size={18} aria-hidden="true" />
                      ) : verdict.type === "danger" ? (
                        <XCircle size={18} aria-hidden="true" />
                      ) : (
                        <Info size={18} aria-hidden="true" />
                      )}
                      <strong>{tr("Khả năng sử dụng:")}{verdict.label}</strong>
                    </div>
                    <p>{verdict.message}</p>
                  </div>
                );
              })()}

              <p className="catalog-description">
                {selected.description || tr("Thông tin mô tả chi tiết được cán bộ quản lý LAB cập nhật.")}
              </p>

              <dl className="catalog-spec-dl">
                <div>
                  <dt>{tr("Địa điểm")}</dt>
                  <dd>{selected.location}</dd>
                </div>
                <div>
                  <dt>{tr("Sức chứa / Số lượng")}</dt>
                  <dd>{selected.capacity}</dd>
                </div>
                <div>
                  <dt>{tr("Phê duyệt")}</dt>
                  <dd>
                    {selected.effectiveRequiresApproval
                      ? tr("Cần cán bộ LAB duyệt trước khi bàn giao")
                      : tr("Xác nhận tự động theo chính sách")}
                  </dd>
                </div>
                <div>
                  <dt>{tr("Đào tạo an toàn")}</dt>
                  <dd>
                    {selected.trainingRequirements && selected.trainingRequirements.length > 0
                      ? selected.trainingRequirements.map((t) => t.name || t.code).join(", ")
                      : tr("Không yêu cầu")}
                  </dd>
                </div>
                {selected.laboratory?.labPolicy && (
                  <div>
                    <dt>{tr("Khung giờ quy định")}</dt>
                    <dd>
                      {selected.laboratory.labPolicy.workDayStartHour || 8}:00 –{" "}
                      {selected.laboratory.labPolicy.workDayEndHour || 18}:00{" "}
                      {selected.laboratory.labPolicy.allowWeekend ? tr("(Mở cả cuối tuần)") : tr("(Ngày làm việc)")}
                    </dd>
                  </div>
                )}
                {selected.model && (
                  <div>
                    <dt>{tr("Model / Ký hiệu")}</dt>
                    <dd>{selected.model}</dd>
                  </div>
                )}
              </dl>

              {/* Busy Schedule in Next 14 Days */}
              <div className="catalog-schedule">
                <div>
                  <strong>{tr("Lịch bận 14 ngày tới")}</strong>
                  <span>{tr("Giờ Việt Nam · UTC+07:00. Hệ thống tự động kiểm tra xung đột thời gian khi bạn gửi yêu cầu đặt lịch.")}</span>
                </div>
                {scheduleLoading && <p role="status">{tr("Đang tải khung bận…")}</p>}
                {scheduleError && (
                  <p role="alert">
                    {scheduleError}{" "}
                    <button type="button" onClick={() => void openDetails(selected, false)}>{tr("Thử lại")}</button>
                  </p>
                )}
                {!scheduleLoading && !scheduleError && busyBookings.length === 0 && busyMaintenance.length === 0 && (
                  <p>{tr("Chưa có khung bận hoặc bảo trì trong khoảng này. Hệ thống vẫn kiểm tra điều kiện và thời gian khi bạn gửi yêu cầu.")}</p>
                )}
                <ul>
                  {busyBookings.slice(0, 6).map((row) => (
                    <li key={`booking-${row.id}`}>
                      <span>{tr(CANONICAL_BOOKING_STATUS_LABELS[row.status || ""] || row.status || "")}</span>
                      <strong>{formatRange(row.startAt, row.endAt)}</strong>
                    </li>
                  ))}
                  {busyMaintenance.slice(0, 4).map((row) => (
                    <li key={`maintenance-${row.id}`}>
                      <span>{row.kind === "calibration" ? tr("Hiệu chuẩn") : tr("Bảo trì")}</span>
                      <strong>{formatRange(row.startAt, row.endAt)}</strong>
                    </li>
                  ))}
                </ul>
                {(busyBookings.length > 6 || busyMaintenance.length > 4) && (
                  <p>{tr("Đang hiển thị")}{Math.min(busyBookings.length, 6) + Math.min(busyMaintenance.length, 4)} / {busyBookings.length + busyMaintenance.length} {tr("khung bận. Đăng nhập để xem lịch đầy đủ.")}</p>
                )}
              </div>

              {/* Internal Booking CTA */}
              <button
                type="button"
                className="public-primary"
                onClick={() => onViewSchedule(selected.id)}
                disabled={detailLoading || Boolean(detailError) || computeEligibility(selected).type === "danger"}
              >
                <CalendarDays size={18} aria-hidden="true" /> {currentUser ? t('Mở lịch để đặt', 'Open calendar to book') : tr('Đăng nhập tài khoản trường để đặt lịch nội bộ')}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>

              {/* Guest Quick Booking Section */}
              {onGuestBookingComplete && !detailLoading && !detailError && computeEligibility(selected).type !== "danger" && (
                <GuestQuickBookingPanel key={selected.id} resource={selected} onComplete={onGuestBookingComplete} />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
