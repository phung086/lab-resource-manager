import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";
import type { BookingAction, BookingActionPayload, BookingRecord } from "../types/booking.js";

export interface BookingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: BookingAction;
  booking: BookingRecord;
  onConfirm: (payload: BookingActionPayload) => Promise<void> | void;
  busy?: boolean;
}

const ACTION_COPY: Record<BookingAction, { title: string; submit: string; hint: string }> = {
  APPROVE: { title: "ui.approve_booking_request_2869fbf5", submit: "ui.approve_booking_99c61da3", hint: "ui.confirm_the_booking_after_checking_59798436" },
  REJECT: { title: "ui.reject_booking_request_ff54380e", submit: "ui.confirm_rejection_91e2bcc4", hint: "ui.the_reason_is_saved_in_f8364d49" },
  CHECK_OUT: { title: "ui.hand_over_resource_2b919047", submit: "ui.confirm_handover_fe4a1650", hint: "ui.record_the_actual_condition_before_abca3376" },
  RETURN: { title: "ui.receive_returned_resource_0c4b837a", submit: "ui.confirm_return_b2f47ecd", hint: "ui.record_the_actual_condition_when_5f156705" },
  SELF_RETURN: { title: "ui.return_room_and_end_session_b4578431", submit: "ui.confirm_room_return_4ffc6e19", hint: "ui.confirm_you_have_left_the_f20d8d44" },
  COMPLETE: { title: "ui.complete_booking_record_2b8ff0eb", submit: "ui.complete_workflow_519742b0", hint: "ui.complete_the_record_after_reviewing_ee0112ff" }
};

const CONDITION_SUGGESTIONS = [
  "ui.exterior_appears_intact_40f7fcf7",
  "ui.all_accessories_counted_1fce6c68",
  "ui.no_irregularities_found_during_the_1ec0829c"
];

export const BookingActionModal: React.FC<BookingActionModalProps> = ({
  isOpen, onClose, action, booking, onConfirm, busy = false
}) => {
  const { tr } = useLocale();
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setCondition("");
      setError("");
    }
  }, [isOpen, action, booking?.id]);

  const copy = Object.fromEntries(Object.entries(ACTION_COPY[action]).map(([key, value]) => [key, tr(value)]));
  const conditionField = action === "CHECK_OUT" ? "conditionBefore" : ["RETURN", "SELF_RETURN"].includes(action) ? "conditionAfter" : null;
  const reasonRequired = action === "REJECT";
  const subtitle = useMemo(() => `${booking?.resource?.code || tr("ui.resource_9a35ef53")} • ${booking?.title || "Booking"}`, [booking, tr]);

  if (!isOpen || !booking) return null;

  function addSuggestion(value: string) {
    setCondition((current) => current.trim() ? `${current.trim()}; ${value}` : value);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    const normalizedCondition = condition.trim();

    if (reasonRequired && !normalizedReason) {
      setError("ui.enter_a_reason_for_rejection_e9310bb1");
      return;
    }
    if (conditionField && !normalizedCondition) {
      setError(action === "CHECK_OUT"
        ? "ui.record_the_resource_condition_before_667112c6"
        : "ui.record_the_resource_condition_after_e8d0fb71");
      return;
    }

    const payload: BookingActionPayload = {};
    if (normalizedReason) payload.reason = normalizedReason;
    if (conditionField === "conditionBefore") payload.conditionBefore = normalizedCondition;
    if (conditionField === "conditionAfter") payload.conditionAfter = normalizedCondition;

    setError("");
    try {
      await onConfirm(payload);
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_complete_the_action_490d03ab");
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={copy.title}
      subtitle={subtitle}
      icon={ClipboardCheck}
      iconColor="text-blue-400"
      maxWidth="max-w-xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{tr("ui.cancel_74fcd352")}</button>
          <button type="submit" form="booking-operation-form" className={`btn ${action === "REJECT" ? "btn-danger" : "btn-primary"}`} disabled={busy}>
            <CheckCircle2 size={15} />
            <span>{busy ? tr("ui.saving_2b5c2a46") : copy.submit}</span>
          </button>
        </>
      }
    >
      <form id="booking-operation-form" onSubmit={submit} className="booking-operation-form" noValidate>
        <div className="operation-modal-resource">
          <div>
            <span className="operation-resource-code">{booking.resource?.code}</span>
            <strong>{booking.resource?.name}</strong>
          </div>
          <ShieldCheck size={18} aria-hidden="true" />
        </div>

        <p className="operation-modal-hint">{copy.hint}</p>
        {action === "RETURN" && booking.handoverCondition && <p className="operation-modal-hint">{tr("ui.condition_at_handover_9424ef4d")}{booking.handoverCondition}</p>}
        {error && <div className="alert danger" role="alert">{translate(error)}</div>}

        {(action === "APPROVE" || action === "REJECT" || action === "COMPLETE") && (
          <label className="operation-field">
            <span>{action === "REJECT" ? tr("ui.reason_for_rejection_ee9546e9") : tr("ui.notes_reason_9fd08697")}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={action === "REJECT" ? tr("ui.explain_the_reason_so_the_bdd20cef") : tr("ui.operational_notes_optional_eea98d3f")}
              maxLength={1000}
              required={reasonRequired}
              autoFocus
            />
          </label>
        )}

        {conditionField && (
          <div className="operation-field">
            <label htmlFor="booking-condition-evidence">
              {action === "CHECK_OUT" ? tr("ui.condition_before_use_714a3dda") : tr("ui.condition_after_use_7497e72b")}
            </label>
            <textarea
              id="booking-condition-evidence"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder={tr("ui.describe_the_actual_condition_observed_f139d5a7")}
              maxLength={2000}
              required
            />
            <div className="operation-suggestion-row" aria-label={tr("ui.suggested_wording_requires_your_verification_43f66e27")}>
              {CONDITION_SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" className="operation-suggestion" onClick={() => addSuggestion(tr(suggestion))}>
                  + {tr(suggestion)}
                </button>
              ))}
            </div>
            <small>{tr("ui.suggestions_help_with_data_entry_6dc67fde")}</small>
          </div>
        )}
      </form>
    </BaseModal2026>
  );
};
