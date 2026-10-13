import { HelpDisclosure } from "../../base/HelpDisclosure";
import { ArrowRight } from "lucide-react";
import { navigateApp, readRouteParams, workspacePathForTab } from "../../../workspaceRoutes.js";
import { paymentSessionStatus, safeVnpayUrl, validatePaymentAction } from "../../../utils/paymentValidation";
import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
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
  paymentUrlExpiresAt: string | null;
  reconciliationStatus: string;
  reconciliationReason: string | null;
  reconciledAt: string | null;
  booking: {
    id: string;
    title: string;
    status: string;
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
  pending: "ui.awaiting_payment_dd717eb2",
  success: "ui.payment_verified_c37ae36e",
  failed: "ui.payment_failed_39d4ec59",
  expired: "ui.session_expired_213530d5",
  refunded: "ui.refunded_d0d4c45f",
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
  return props.bookingId ? <BookingCheckout user={props.user} bookingId={props.bookingId} onClearBooking={props.onClearBooking} /> : <PaymentsLedger {...props} />;
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
  const { tr } = useLocale();
  const admin = user.role === "ADMIN";
  const loadAbort = useRef<AbortController | null>(null), busyRef = useRef(false), selectionRef = useRef(readRouteParams().get("transaction") || ""), notesRef = useRef<Record<string,string>>({}), dossierRef = useRef<HTMLElement>(null);
  const [formErrors,setFormErrors] = useState<Record<string,string>>({});
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
    [copied, setCopied] = useState(""),
    [reconciliationReason, setReconciliationReason] = useState("");
  const [receipt, setReceipt] = useState<{
    title: string;
    disclaimer: string;
    transaction: Payment;
    generatedAt: string;
  } | null>(null);
  const [bookings, setBookings] = useState<{ id: string; title: string; status: string; feeAmountVnd: number }[]>([]);
  async function load() {
    loadAbort.current?.abort(); const controller = new AbortController(); loadAbort.current = controller;
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (bookingId) q.set("bookingId", bookingId);
      if (status) q.set("status", status);
      if (provider) q.set("provider", provider);
      if (search) q.set("search", search);
      const data = await apiRequest(
        `/payments/${admin ? "admin/transactions" : "my"}?${q}`, { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setRows(data.transactions);
      setProviders(data.providers);
      if (selectionRef.current) {
        const refreshed =
          data.transactions.find((r: Payment) => r.id === selectionRef.current) || null;
        setSelected(refreshed);
        if (refreshed?.status !== "pending") {
          setQr(null);
          setUrl("");
          setCopied("");
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const controller=new AbortController(); void loadRef.current();
    if(admin) apiRequest("/bookings",{signal:controller.signal}).then(setBookings).catch((cause:Error)=>{if(!controller.signal.aborted)setError(cause.message);});
    return()=>{controller.abort();loadAbort.current?.abort();};
  },[admin,bookingId]);
  useEffect(()=>{const sync=()=>{const id=readRouteParams().get('transaction') || '';notesRef.current[selectionRef.current]=reconciliationReason;selectionRef.current=id;setSelected(rows.find(row=>row.id===id)||null);setReconciliationReason(notesRef.current[id]||'');setQr(null);setUrl('');setCopied('');setFormErrors({});};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[rows,reconciliationReason]);
  function choose(row: Payment) {
    if(busyRef.current)return;
    notesRef.current[selectionRef.current]=reconciliationReason; selectionRef.current=row.id;
    setSelected(row);setReconciliationReason(notesRef.current[row.id]||'');setQr(null);setUrl('');setCopied('');setError('');setFormErrors({});
    const params=readRouteParams();params.set('transaction',row.id);navigateApp(workspacePathForTab('payments',params),{notify:false});
    if(window.matchMedia('(max-width:1000px)').matches)requestAnimationFrame(()=>{dossierRef.current?.scrollIntoView({block:'start'});dossierRef.current?.focus({preventScroll:true});});
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const checked=validatePaymentAction("charge",{bookingId:String(data.get("bookingId")||""),description:String(data.get("description")||"")},bookings.filter(row=>row.status==="CONFIRMED"&&row.feeAmountVnd>0).map(row=>row.id));
    setFormErrors(checked.errors); if(!checked.data){form.querySelector<HTMLElement>('[name="'+Object.keys(checked.errors)[0]+'"]')?.focus();return;}
    busyRef.current=true;setBusy("charge");
    setError("");
    try {
      await apiRequest("/payments/charges", {
        method: "POST",
        body: JSON.stringify(checked.data),
      });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current=false;setBusy("");
    }
  }
  async function initiate(method: string) {
    if (!selected || busyRef.current || selected.userId !== user.id || selected.booking?.status !== 'CONFIRMED' || !['pending','failed','expired'].includes(selected.status)) return;
    busyRef.current=true;
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
      if (data.paymentUrl) { const safe=safeVnpayUrl(data.paymentUrl);if(!safe)throw new Error("ui.invalid_vnpay_payment_address_please_bed3b506");setUrl(safe); }
      selectionRef.current=data.transaction.id;const params=readRouteParams();params.set("transaction",data.transaction.id);navigateApp(workspacePathForTab("payments",params),{notify:false});
      setRows(previous => previous.some(row=>row.id===data.transaction.id)?previous.map(row=>row.id===data.transaction.id?data.transaction:row):[data.transaction,...previous]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current=false;setBusy("");
    }
  }
  async function openReceipt(row: Payment) {
    if(busyRef.current)return;busyRef.current=true;setBusy(row.id);
    setError("");
    try {
      setReceipt(await apiRequest(`/payments/${row.id}/receipt`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current=false;setBusy("");
    }
  }
  async function resolveReconciliation() {
    if (!selected || busyRef.current) return;
    const checked=validatePaymentAction("reconcile",{reason:reconciliationReason});setFormErrors(checked.errors);if(!checked.data){document.getElementById("payment-reason")?.focus();return;}busyRef.current=true;
    setBusy("reconciliation");
    setError("");
    try {
      const saved = await apiRequest(`/payments/${selected.id}/reconciliation/resolve`, {
        method: "POST",
        body: JSON.stringify(checked.data),
      });
      setSelected(saved);
      setReconciliationReason("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current=false;setBusy("");
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(translate("ui.copied_092dba1f", { value0: label }));
    } catch {
      setCopied(
        translate("ui.automatic_copying_failed_select_the_2c75e78e"),
      );
    }
  }
  return (
    <section className="content-stack payment-page payment-ledger">

      <header className="page-section-header">
        <div>
          <h1>
            {bookingId
              ? translate("ui.lab_booking_payment_5e2f0fb9")
              : admin
                ? translate("ui.payment_ledger_49cf3f23")
                : translate("ui.my_payments_dae6e05a")}
          </h1>
          <HelpDisclosure>{translate("ui.charges_use_the_confirmed_booking_d4c0b90a")}</HelpDisclosure>
        </div>
        <button
          className="secondary-button"
          disabled={loading || !!busy}
          onClick={load}
        >
          {tr("ui.refresh_b4c61340")}</button>
      </header>
      {bookingId && (
        <div className="alert">
          <p>
             {translate("ui.charges_and_receipts_for_booking_522439cb")}{" "}
            <span className="payment-ref">{bookingId}</span>
          </p>
          <p>
             {translate("ui.choose_a_charge_below_to_a13ee3b9")} </p>
          <button className="secondary-button" onClick={onClearBooking}>
             {translate("ui.view_all_transactions_6001f878")} </button>
        </div>
      )}
      {error && (
        <div role="alert" className="alert danger">
          {translate(error)}
        </div>
      )}
      {admin && (
        <details className="panel payment-charge">
          <summary>{translate("ui.create_a_payment_request_7a755c80")}</summary>
          <form onSubmit={create} className="booking-form" noValidate>
            <fieldset disabled={!!busy}>
            {Object.keys(formErrors).some(key=>key!=="reason") && <div className="alert danger" role="alert"><ul>{Object.entries(formErrors).filter(([key])=>key!=="reason").map(([key,value])=><li key={key}>{tr(value)}</li>)}</ul></div>}
            <label>
              {tr("ui.bookings_00f5b333")}<select
                name="bookingId"
                required
                defaultValue={bookingId || ""}
                key={bookingId || "all"}
                aria-invalid={!!formErrors.bookingId}
                aria-describedby={formErrors.bookingId?"payment-booking-error":undefined}
              >
                <option value="">{translate("ui.select_a_booking_ee647416")}</option>
                {bookings.filter(b=>b.status==="CONFIRMED"&&b.feeAmountVnd>0).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} · {b.id}
                  </option>
                ))}
              </select>
              {formErrors.bookingId && <small id="payment-booking-error" className="payment-field-error">{tr(formErrors.bookingId)}</small>}
            </label>
            <label>
               {translate("ui.request_description_6784151f")} <input
                name="description"
                aria-invalid={!!formErrors.description}
                aria-describedby={formErrors.description?"payment-description-error":undefined}
                minLength={3}
                maxLength={500}
                required
              />
              {formErrors.description && <small id="payment-description-error" className="payment-field-error">{tr(formErrors.description)}</small>}
            </label>
            <button className="primary-button" disabled={!!busy}>
              {tr("ui.request_created_a7754180")}</button>
            </fieldset>
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
           {translate("ui.find_transactions_dcd7a5a8")} <input
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}

          />
        </label>
        <label>
          {tr("ui.status_cb31de81")}<select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{tr("ui.all_49c73a31")}</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {tr(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
           {translate("ui.method_2d29dd82")} <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="">{tr("ui.all_49c73a31")}</option>
            <option value="unselected">{translate("ui.not_selected_e5f50074")}</option>
            <option value="vnpay">{translate("ui.vnpay_sandbox_667598b8")}</option>
            <option value="vietqr">{translate("ui.vietqr_d3f03ab0")}</option>
          </select>
        </label>
        <button className="secondary-button" disabled={loading}>
           {translate("ui.filter_transactions_d79035fe")} </button>
      </form>
      <div className="payment-ledger-layout"><div className="payment-ledger-main">
      {loading ? (
        <p role="status">{translate("ui.loading_transactions_68570a8d")}</p>
      ) : !rows.length ? (
        <p className="empty-state">
          {error
            ? translate("ui.unable_to_load_transactions_please_79da9051")
            : translate("ui.no_matching_payment_requests_4df227bf")}
        </p>
      ) : (
        <div className="table-wrap payment-register"><table><caption className="sr-only">{tr('ui.payment_ledger_49cf3f23')}</caption><thead><tr><th>{tr('ui.bookings_00f5b333')}</th><th>{tr('ui.amount_4cbdc55b')}</th><th>{tr('ui.status_cb31de81')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className={selected?.id===row.id?'is-selected':''}><td><button type="button" disabled={!!busy} onClick={()=>choose(row)} aria-pressed={selected?.id===row.id}><span><strong>{row.booking?.title || tr('ui.booking_no_longer_linked_6ba25274')}</strong><small>{row.txnRef}</small><small>{row.user?.fullName} · {formatVietnamDateTime(row.createdAt)}</small></span><ArrowRight size={16} /></button></td><td>{money(row.amount)}</td><td><span className={'payment-state payment-'+paymentSessionStatus(row)}>{tr(labels[paymentSessionStatus(row)])}</span></td></tr>)}</tbody></table></div>
      )}
      <HelpDisclosure>{tr('ui.showing_up_to_100_recent_6f1a8435')}</HelpDisclosure>
      </div>
      <aside ref={dossierRef} tabIndex={-1} className="payment-dossier" aria-label={tr('ui.payment_request_ec7f1b84')}>
        <header><h2>{tr('ui.payment_request_ec7f1b84')}</h2></header>
        {!selected && <p className="empty-state">{tr('ui.payments.selectTransaction')}</p>}
        {selected && <button type="button" className="btn btn-secondary" onClick={()=>void load()} disabled={loading||!!busy}>{tr('ui.refresh_status_5c5763c1')}</button>}
        {selected && (
          <div className="payment-detail">
            <h2>{selected.booking?.title}</h2>
            <p>{selected.booking?.resource.name}</p>
            <p>{selected.description}</p>
            <p>{tr("ui.payer_9f6325a0")}: {selected.user?.fullName}</p>
            {selected.booking && <a className="table-action" href={workspacePathForTab("bookings",new URLSearchParams({booking:selected.booking.id}))}>{tr("ui.bookings_00f5b333")} <ArrowRight size={16} /></a>}
            <strong className="payment-amount">{money(selected.amount)}</strong>
            <span className={`payment-state payment-${paymentSessionStatus(selected)}`}>
              {selected.provider === "vietqr" && selected.status === "pending"
                ? translate("ui.awaiting_reconciliation_06361b86")
                : tr(labels[paymentSessionStatus(selected)])}
            </span>
            <p className="payment-ref">{translate("ui.transaction_reference_05a9f7a2")} {selected.txnRef}</p>
            {selected.reconciliationStatus !== "none" && (
              <div className="alert warning" role="status">
                <strong>{selected.reconciliationStatus === "manual_review" ? translate("ui.manual_reconciliation_required_ad0551a4") : translate("ui.reconciliation_resolved_6c18a62d")}</strong>
                <p>{selected.reconciliationReason || translate("ui.an_administrator_needs_to_review_463c5778")}</p>
              </div>
            )}
            <ol className="payment-timeline" aria-label={translate("ui.payment_progress_280450c6")}>
              <li className="is-complete"><strong>{translate("ui.request_created_8af32592")}</strong><time dateTime={selected.createdAt}>{formatVietnamDateTime(selected.createdAt)}</time></li>
              <li className={selected.provider !== "unselected" ? "is-complete" : ""}><strong>{selected.provider !== "unselected" ? translate("ui.method_selected_ef6b1341") : translate("ui.choose_method_da36b3c9")}</strong><span>{selected.provider === "vnpay" ? tr('ui.vnpay_sandbox_667598b8') : selected.provider === "vietqr" ? "VietQR" : translate("ui.not_initiated_fd25f9ff")}</span></li>
              <li className={selected.status === "success" ? "is-complete" : ""}><strong>{tr(labels[paymentSessionStatus(selected)])}</strong>{selected.paidAt && <time dateTime={selected.paidAt}>{formatVietnamDateTime(selected.paidAt)}</time>}</li>
            </ol>
            {error && (
              <p className="alert danger" role="alert">
                {translate(error)}
              </p>
            )}
            {['pending','failed','expired'].includes(selected.status) && selected.userId === user.id && selected.booking?.status === 'CONFIRMED' && (
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
                     {translate("ui.vnpay_sandbox_667598b8")}
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
                     {translate("ui.vietqr_d3f03ab0")} <small>{translate("ui.bank_transfer_952fce3f")}</small>
                  </button>
                </div>
              </>
            )}
            {busy && <p role="status">{translate("ui.processing_79eb2035")}</p>}
            {selected.status === "pending" && url && (
              <div className="alert">
                <strong>{translate("ui.vnpay_sandbox_00e87848")}</strong>
                <a
                  className="primary-button"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                   {translate("ui.continue_to_vnpay_sandbox_e35da209")} </a>
              </div>
            )}
            {selected.status === "pending" && qr && (
              <>
                <p className="alert">
                   {translate("ui.awaiting_reconciliation_the_qr_code_53e0c4b8")} </p>
                <img
                  className="payment-qr"
                  src={qr.qrUrl}
                  alt={translate("ui.vietqr_for_transaction_2dbf8b17", { value0: selected.txnRef })}
                  onError={() =>
                    setError(
                      "ui.unable_to_load_the_provider_5b97408c",
                    )
                  }
                  referrerPolicy="no-referrer"
                />
                <dl>
                  {[
                    [translate("ui.bank_bin_18dfee69"), qr.bank],
                    [translate("ui.account_holder_4c1976fc"), qr.accountName],
                    [translate("ui.account_number_0ff9e285"), qr.accountNumber],
                    [translate("ui.amount_4cbdc55b"), String(qr.amount)],
                    [translate("ui.transfer_description_bcc3b45e"), qr.content],
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {value}{" "}
                        <button
                          className="table-action"
                          onClick={() => copy(value, label)}
                        >
                           {translate("ui.copy_68b42caf")} {label.toLowerCase()}
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

                }}
              >
                 {translate("ui.open_receipt_68f863f1")} </button>
            )}
            {admin && selected.reconciliationStatus === "manual_review" && (
              <div className="booking-form">
                <label>
                   {translate("ui.manual_resolution_outcome_06042ed2")} <textarea
                    id="payment-reason"
                    aria-invalid={!!formErrors.reason}
                    aria-describedby={formErrors.reason?"payment-reason-error":undefined}
                    value={reconciliationReason}
                    minLength={3}
                    maxLength={500}
                    onChange={(event) => setReconciliationReason(event.target.value)}

                  />
                  {formErrors.reason && <small id="payment-reason-error" className="payment-field-error">{tr(formErrors.reason)}</small>}
                </label>
                <button
                  className="primary-button"
                  disabled={!!busy}
                  onClick={() => void resolveReconciliation()}
                >
                   {translate("ui.mark_as_resolved_de951dcd")} </button>
                <small>{translate("ui.this_action_does_not_call_1935b651")}</small>
              </div>
            )}
          </div>
        )}
      </aside></div>
      {admin && <ResourcePricingEditor />}
      <BaseModal2026
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title={translate("ui.internal_payment_receipt_d9efbde5")}
        footer={
          <button className="primary-button" onClick={() => window.print()}>
             {translate("ui.print_receipt_ce9c48ea")} </button>
        }
      >
        {receipt && (
          <article className="payment-receipt">
            <h2>{receipt.title}</h2>
            <p className="payment-state payment-success">
              {tr(labels[receipt.transaction.status])} ·{" "}
              {receipt.transaction.provider === "vnpay"
                ? "VNPAY"
                : receipt.transaction.provider}
            </p>
            <dl>
              {Object.entries({
                [translate("ui.transaction_reference_717b27eb")]: receipt.transaction.txnRef,
                [translate("ui.amount_4cbdc55b")]: `${money(receipt.transaction.amount)} (${receipt.transaction.currency})`,
                [translate("ui.payer_9f6325a0")]: receipt.transaction.user.fullName,
                [translate("ui.bookings_00f5b333")]:
                  receipt.transaction.booking?.title || translate("ui.no_longer_linked_774c604c"),
                [translate("ui.booking_reference_189e7a5d")]: receipt.transaction.booking?.id || "—",
                [translate("ui.resource_9a35ef53")]: `${receipt.transaction.booking?.resource.code || ""} ${receipt.transaction.booking?.resource.name || ""}`,
                [translate("ui.payment_time_cfbad42e")]: receipt.transaction.paidAt
                  ? formatVietnamDateTime(receipt.transaction.paidAt)
                  : "—",
                [translate("ui.receipt_generated_at_9f7b0997")]: formatVietnamDateTime(receipt.generatedAt),
              }).map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <HelpDisclosure>{receipt.disclaimer}</HelpDisclosure>
          </article>
        )}
      </BaseModal2026>
    </section>
  );
}
