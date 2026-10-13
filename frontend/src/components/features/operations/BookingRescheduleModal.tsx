import React, { useState } from "react";
import { BaseModal2026 } from "../../BaseModal2026";
import { useLocale } from "../../../providers/LocaleProvider";
import { apiRequest } from "../../../api.js";
import { formatVietnamDateTime, vietnamTimeToIso } from "../../../utils/timezone";
import type { BookingRecord } from "../../../types/booking";
export function BookingRescheduleModal({ booking, onClose, onSaved }: { booking: BookingRecord; onClose: () => void; onSaved: () => void }) {
  const { tr } = useLocale();
  const wall = new Date(+new Date(booking.startAt) + 7*3600000).toISOString();
  const [date,setDate] = useState(wall.slice(0,10)), [time,setTime] = useState(wall.slice(11,16)), [reason,setReason] = useState("");
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  let startAt = "", endAt = "";
  try { startAt = vietnamTimeToIso(date,time); endAt = new Date(+new Date(startAt) + (+new Date(booking.endAt)-+new Date(booking.startAt))).toISOString(); } catch { /* Native required inputs keep incomplete drafts editable. */ }
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try { await apiRequest(`/bookings/${booking.id}/reschedule`,{method:"POST",body:JSON.stringify({startAt,endAt,expectedStartAt:booking.startAt,reason})});onSaved();onClose(); }
    catch(cause){setError(cause instanceof Error?cause.message:"api.API_REQUEST_FAILED");}finally{setBusy(false);}
  }
  return <BaseModal2026 isOpen onClose={busy?()=>{}:onClose} title={tr("ui.rental.moveBooking")} subtitle={booking.resource.name}>
    <form className="booking-form" onSubmit={save}><fieldset disabled={busy}><div className="form-grid"><label>{tr("ui.rental.date")}<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>{tr("ui.rental.startTime")}<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label></div><p>{tr("ui.rental.endsAt")} {endAt ? formatVietnamDateTime(endAt) : "—"}</p><label>{tr("ui.care.reason")}<textarea required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{tr(error)}</p>}<button className="btn btn-primary" type="submit">{tr(busy?"ui.users.saving":"ui.care.confirm")}</button></fieldset></form>
  </BaseModal2026>;
}
