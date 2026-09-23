import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../../api.js";
import { BaseModal2026 } from "../../BaseModal2026";
import { formatVietnamDateTime } from "../../../utils/timezone";
import "./payments.css";
import { ResourcePricingEditor } from "./ResourcePricingEditor";
import { BookingCheckout } from "./BookingCheckout";
type Payment = {
  id: string;
  txnRef: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  userId: string;
  description: string;
  createdAt: string;
  paidAt: string | null;
  booking: {
    id: string;
    title: string;
    resource: { code: string; name: string };
  } | null;
  user: { fullName: string };
};
type Qr = {
  qrUrl: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
};
const labels: Record<string, string> = {
  pending: "Chờ thanh toán",
  success: "Đã xác minh thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};
const money = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v,
  );
export default function PaymentsPage(props: {
  user: { id: string; role: string };
  bookingId?: string;
  onClearBooking?: () => void;
}) {
  return props.bookingId ? <BookingCheckout bookingId={props.bookingId} onClearBooking={props.onClearBooking} /> : <PaymentsLedger {...props} />;
}

function PaymentsLedger({
  user,
  bookingId,
  onClearBooking,
}: {
  user: { id: string; role: string };
  bookingId?: string;
  onClearBooking?: () => void;
}) {
  const admin = user.role === "ADMIN";
  const [rows, setRows] = useState<Payment[]>([]),
    [providers, setProviders] = useState({ vnpay: false, vietqr: false });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const [status, setStatus] = useState(""),
    [provider, setProvider] = useState(""),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Payment | null>(null),
    [qr, setQr] = useState<Qr | null>(null),
    [url, setUrl] = useState(""),
    [copied, setCopied] = useState("");
  const [receipt, setReceipt] = useState<{
    title: string;
    disclaimer: string;
    transaction: Payment;
    generatedAt: string;
  } | null>(null);
  const [bookings, setBookings] = useState<{ id: string; title: string }[]>([]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (bookingId) q.set("bookingId", bookingId);
      if (status) q.set("status", status);
      if (provider) q.set("provider", provider);
      if (search) q.set("search", search);
      const data = await apiRequest(
        `/payments/${admin ? "admin/transactions" : "my"}?${q}`,
      );
      setRows(data.transactions);
      setProviders(data.providers);
      if (selected) {
        const refreshed =
          data.transactions.find((r: Payment) => r.id === selected.id) || null;
        setSelected(refreshed);
        if (refreshed?.status !== "pending") {
          setQr(null);
          setUrl("");
          setCopied("");
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    void loadRef.current();
    if (admin)
      apiRequest("/bookings")
        .then(setBookings)
        .catch(() => setError("Không tải được danh sách lịch đặt."));
  }, [admin, bookingId]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("charge");
    setError("");
    try {
      await apiRequest("/payments/charges", {
        method: "POST",
        body: JSON.stringify({
          bookingId: data.get("bookingId"),
          amount: Number(data.get("amount")),
          description: data.get("description"),
        }),
      });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function initiate(method: string) {
    if (!selected || busy) return;
    setBusy(method);
    setError("");
    setQr(null);
    setUrl("");
    try {
      const data = await apiRequest(`/payments/${selected.id}/${method}`, {
        method: "POST",
        body: "{}",
      });
      setSelected(data.transaction);
      if (data.vietqr) setQr(data.vietqr);
      if (data.paymentUrl) setUrl(data.paymentUrl);
      setRows((previous) =>
        previous.map((row) =>
          row.id === data.transaction.id ? data.transaction : row,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function openReceipt(row: Payment) {
    setBusy(row.id);
    setError("");
    try {
      setReceipt(await apiRequest(`/payments/${row.id}/receipt`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`Đã sao chép: ${label}`);
    } catch {
      setCopied(
        "Không thể sao chép tự động; bạn có thể chọn nội dung để sao chép.",
      );
    }
  }
  return (
    <section className="content-stack payment-page">
      {admin && <ResourcePricingEditor />}
      <header className="page-section-header">
        <div>
          <h1>
            {bookingId
              ? "Thanh toán đặt phòng LAB"
              : admin
                ? "Sổ giao dịch thanh toán"
                : "Thanh toán của tôi"}
          </h1>
          <p className="section-description">
            Khoản thu được tạo theo phí đã chốt khi lịch đặt được xác nhận, hoặc do quản trị viên lập.
            Trạng thái thanh toán được theo dõi riêng cho từng lịch đặt.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading || !!busy}
          onClick={load}
        >
          Làm mới
        </button>
      </header>
      {bookingId && (
        <div className="alert">
          <p>
            Khoản thu và biên nhận của lịch đặt:{" "}
            <span className="payment-ref">{bookingId}</span>
          </p>
          <p>
            Chọn yêu cầu thanh toán bên dưới để tiếp tục qua VNPAY Sandbox hoặc
            VietQR. Lịch cần duyệt chỉ có khoản thu sau khi được xác nhận; lịch miễn phí không cần thanh toán.
          </p>
          <button className="secondary-button" onClick={onClearBooking}>
            Xem tất cả giao dịch
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="alert danger">
          {error}
        </div>
      )}
      {admin && (
        <details className="panel payment-charge">
          <summary>Tạo yêu cầu thanh toán</summary>
          <form onSubmit={create} className="booking-form">
            <label>
              Lịch đặt
              <select
                name="bookingId"
                required
                defaultValue={bookingId || ""}
                key={bookingId || "all"}
              >
                <option value="">Chọn lịch đặt</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} · {b.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số tiền (VND)
              <input
                name="amount"
                type="number"
                min="1"
                max="9999999999"
                step="1"
                required
              />
            </label>
            <label>
              Nội dung yêu cầu
              <input
                name="description"
                minLength={3}
                maxLength={500}
                required
              />
            </label>
            <p>
              Lịch có bảng giá đã tự tạo khoản thu khi được xác nhận. Chỉ lập thủ công cho khoản thu đã được xác định và chưa có giao dịch.
            </p>
            <button className="primary-button" disabled={!!busy}>
              Tạo yêu cầu
            </button>
          </form>
        </details>
      )}
      <form
        className="panel payment-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Tìm giao dịch
          <input
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mã giao dịch hoặc lịch đặt"
          />
        </label>
        <label>
          Trạng thái
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Phương thức
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="unselected">Chưa chọn</option>
            <option value="vnpay">VNPAY Sandbox</option>
            <option value="vietqr">VietQR</option>
          </select>
        </label>
        <button className="secondary-button" disabled={loading}>
          Lọc giao dịch
        </button>
      </form>
      {loading ? (
        <p role="status">Đang tải giao dịch…</p>
      ) : !rows.length ? (
        <p className="empty-state">
          {error
            ? "Không thể tải giao dịch. Hãy thử lại."
            : "Chưa có yêu cầu thanh toán phù hợp."}
        </p>
      ) : (
        <div className="payment-list">
          {rows.map((row) => (
            <article className="panel payment-card" key={row.id}>
              <div className="payment-card-heading">
                <h2>{row.booking?.title || "Lịch đặt không còn liên kết"}</h2>
                <span className={`payment-state payment-${row.status}`}>
                  {labels[row.status]}
                </span>
              </div>
              <p>
                {row.booking?.resource.code} · {row.booking?.resource.name}
              </p>
              <strong className="payment-amount">{money(row.amount)}</strong>
              <dl>
                <dt>Mã giao dịch</dt>
                <dd>{row.txnRef}</dd>
                <dt>Người thanh toán</dt>
                <dd>{row.user.fullName}</dd>
                <dt>Phương thức</dt>
                <dd>
                  {row.provider === "vnpay"
                    ? "VNPAY · SANDBOX"
                    : row.provider === "vietqr"
                      ? row.status === "pending"
                        ? "VietQR · Chờ đối soát"
                        : "VietQR"
                      : "Chưa chọn"}
                </dd>
                <dt>Tạo lúc</dt>
                <dd>{formatVietnamDateTime(row.createdAt)}</dd>
                {row.paidAt && (
                  <>
                    <dt>Đã thanh toán lúc</dt>
                    <dd>{formatVietnamDateTime(row.paidAt)}</dd>
                  </>
                )}
              </dl>
              <p>{row.description}</p>
              <div className="payment-actions">
                {row.status === "pending" && row.userId === user.id && (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setSelected(row);
                      setQr(null);
                      setUrl("");
                      setError("");
                    }}
                  >
                    Xem yêu cầu thanh toán
                  </button>
                )}
                {row.status === "success" && (
                  <button
                    className="secondary-button"
                    disabled={!!busy}
                    onClick={() => openReceipt(row)}
                  >
                    Mở biên nhận
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="section-description">
        Hiển thị tối đa 100 giao dịch mới nhất phù hợp bộ lọc.
      </p>
      <BaseModal2026
        isOpen={!!selected}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        dismissible={!busy}
        title="Yêu cầu thanh toán"
        subtitle="Thanh toán không tự duyệt hoặc hoàn tất booking"
        footer={
          <button
            className="secondary-button"
            onClick={load}
            disabled={loading || !!busy}
          >
            Làm mới trạng thái
          </button>
        }
      >
        {selected && (
          <div className="payment-detail">
            <h2>{selected.booking?.title}</h2>
            <p>{selected.booking?.resource.name}</p>
            <strong className="payment-amount">{money(selected.amount)}</strong>
            <span className={`payment-state payment-${selected.status}`}>
              {selected.provider === "vietqr" && selected.status === "pending"
                ? "Đang chờ đối soát"
                : labels[selected.status]}
            </span>
            <p className="payment-ref">Mã giao dịch · {selected.txnRef}</p>
            <ol className="payment-timeline" aria-label="Tiến trình thanh toán">
              <li className="is-complete"><strong>Yêu cầu đã tạo</strong><time dateTime={selected.createdAt}>{formatVietnamDateTime(selected.createdAt)}</time></li>
              <li className={selected.provider !== "unselected" ? "is-complete" : ""}><strong>{selected.provider !== "unselected" ? "Đã chọn phương thức" : "Chọn phương thức"}</strong><span>{selected.provider === "vnpay" ? "VNPAY Sandbox" : selected.provider === "vietqr" ? "VietQR" : "Chưa khởi tạo"}</span></li>
              <li className={selected.status === "success" ? "is-complete" : ""}><strong>{selected.status === "success" ? "Đã xác minh" : selected.status === "failed" ? "Giao dịch thất bại" : "Chờ xác minh"}</strong><span>{selected.paidAt ? formatVietnamDateTime(selected.paidAt) : "Chưa ghi nhận thanh toán thành công"}</span></li>
            </ol>
            {error && (
              <p className="alert danger" role="alert">
                {error}
              </p>
            )}
            {selected.status === "pending" && (
              <>
                <div className="payment-provider-choices">
                  <button
                    className="secondary-button"
                    disabled={
                      !!busy ||
                      !providers.vnpay ||
                      !["unselected", "vnpay"].includes(selected.provider)
                    }
                    onClick={() => initiate("vnpay")}
                  >
                    VNPAY Sandbox <small>SANDBOX · thử nghiệm</small>
                  </button>
                  <button
                    className="secondary-button"
                    disabled={
                      !!busy ||
                      !providers.vietqr ||
                      !["unselected", "vietqr"].includes(selected.provider)
                    }
                    onClick={() => initiate("vietqr")}
                  >
                    VietQR <small>Chuyển khoản ngân hàng</small>
                  </button>
                </div>
                {(!providers.vnpay || !providers.vietqr) && (
                  <p>
                    Phương thức bị vô hiệu hóa chưa được cấu hình trên máy chủ.
                  </p>
                )}
                <p>
                  Khi đã khởi tạo, phương thức được giữ cố định để tránh thanh
                  toán trùng.
                </p>
              </>
            )}
            {busy && <p role="status">Đang xử lý…</p>}
            {selected.status === "pending" && url && (
              <div className="alert">
                <strong>VNPAY SANDBOX</strong>
                <p>
                  Chưa có kết quả được xác minh. Sau thử nghiệm, quay lại và làm
                  mới trạng thái.
                </p>
                <a
                  className="primary-button"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tiếp tục đến VNPAY Sandbox
                </a>
              </div>
            )}
            {selected.status === "pending" && qr && (
              <>
                <p className="alert">
                  Đang chờ đối soát. Mã QR đã được tạo; hệ thống chưa xác minh
                  tiền đã nhận. Chuyển khoản tới tài khoản thật có thể gửi tiền
                  thật.
                </p>
                <img
                  className="payment-qr"
                  src={qr.qrUrl}
                  alt={`VietQR cho giao dịch ${selected.txnRef}`}
                  onError={() =>
                    setError(
                      "Không tải được ảnh QR từ provider. Không thực hiện chuyển khoản nếu chưa kiểm tra thông tin.",
                    )
                  }
                  referrerPolicy="no-referrer"
                />
                <dl>
                  {[
                    ["Ngân hàng (BIN)", qr.bank],
                    ["Tên tài khoản", qr.accountName],
                    ["Số tài khoản", qr.accountNumber],
                    ["Số tiền", String(qr.amount)],
                    ["Nội dung chuyển khoản", qr.content],
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {value}{" "}
                        <button
                          className="table-action"
                          onClick={() => copy(value, label)}
                        >
                          Sao chép {label.toLowerCase()}
                        </button>
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
                <p role="status">{copied}</p>
              </>
            )}
            {selected.status === "success" && (
              <button
                className="primary-button"
                onClick={() => {
                  void openReceipt(selected);
                  setSelected(null);
                }}
              >
                Mở biên nhận
              </button>
            )}
          </div>
        )}
      </BaseModal2026>
      <BaseModal2026
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title="Biên nhận thanh toán nội bộ"
        footer={
          <button className="primary-button" onClick={() => window.print()}>
            In biên nhận
          </button>
        }
      >
        {receipt && (
          <article className="payment-receipt">
            <h2>{receipt.title}</h2>
            <p className="payment-state payment-success">
              {labels[receipt.transaction.status]} ·{" "}
              {receipt.transaction.provider === "vnpay"
                ? "VNPAY SANDBOX"
                : receipt.transaction.provider}
            </p>
            <dl>
              {Object.entries({
                "Mã giao dịch": receipt.transaction.txnRef,
                "Số tiền": `${money(receipt.transaction.amount)} (${receipt.transaction.currency})`,
                "Người thanh toán": receipt.transaction.user.fullName,
                "Lịch đặt":
                  receipt.transaction.booking?.title || "Không còn liên kết",
                "Mã lịch đặt": receipt.transaction.booking?.id || "—",
                "Tài nguyên": `${receipt.transaction.booking?.resource.code || ""} ${receipt.transaction.booking?.resource.name || ""}`,
                "Thanh toán lúc": receipt.transaction.paidAt
                  ? formatVietnamDateTime(receipt.transaction.paidAt)
                  : "—",
                "Biên nhận tạo lúc": formatVietnamDateTime(receipt.generatedAt),
              }).map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p>{receipt.disclaimer}</p>
          </article>
        )}
      </BaseModal2026>
    </section>
  );
}
