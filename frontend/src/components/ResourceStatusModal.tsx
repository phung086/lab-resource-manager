import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, Wrench } from "lucide-react";

import { BaseModal2026 } from "./BaseModal2026";

export interface ResourceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: any;
  statuses: string[];
  initialStatus?: string;
  destructive?: boolean;
  onConfirm: (status: string, reason: string) => Promise<void>;
}

const labels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d",
  IN_USE: "ui.in_use_a07a3647",
  MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8",
  BROKEN: "ui.broken_fd69bba6",
  RETIRED: "ui.retire_f9fe2615",
  OFFLINE: "ui.offline_96a8bb03"
};
const reasonRequired = new Set(["MAINTENANCE", "CALIBRATION", "BROKEN", "RETIRED", "OFFLINE"]);

export const ResourceStatusModal: React.FC<ResourceStatusModalProps> = ({
  isOpen,
  onClose,
  resource,
  statuses,
  initialStatus,
  destructive = false,
  onConfirm
}) => {
  const { tr } = useLocale();
  const [targetStatus, setTargetStatus] = useState(initialStatus || statuses[0] || "AVAILABLE");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetStatus(initialStatus || statuses.find((status) => status !== resource?.operationalStatus) || statuses[0] || "AVAILABLE");
      setReason("");
      setError("");
    }
  }, [isOpen, initialStatus, resource?.id]);

  if (!isOpen || !resource) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reasonRequired.has(targetStatus) && reason.trim().length < 3) {
      setError("ui.enter_a_specific_reason_of_42ccd191");
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(targetStatus, reason.trim());
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_update_resource_status_03bf3820");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={destructive ? tr("ui.retire_resource_c9cb8b85") : tr("ui.update_physical_status_a7b4b46e")}
      subtitle={`${resource.code} · ${resource.name}`}
      icon={destructive ? Archive : Wrench}
      iconColor={destructive ? "text-rose-400" : "text-amber-400"}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>{tr("ui.cancel_74fcd352")}</button>
          <button type="submit" form="resource-status-form" className={destructive ? "danger-button" : "primary-button"} disabled={busy || targetStatus === resource.operationalStatus}>
            {busy ? tr("ui.saving_2b5c2a46") : destructive ? tr("ui.confirm_retirement_01d36398") : tr("ui.save_status_6af430fc")}
          </button>
        </>
      }
    >
      {error && <div ref={errorRef} tabIndex={-1} className="alert danger" role="alert"><AlertTriangle size={15} aria-hidden="true" /> {translate(error)}</div>}
      <form id="resource-status-form" className="booking-form" onSubmit={submit}>
        <label htmlFor="resource-target-status">
          <span>{tr("ui.new_status_96c219fc")}</span>
          <select id="resource-target-status" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} disabled={destructive}>
            {statuses.map((status) => <option key={status} value={status}>{labels[status] || status}</option>)}
          </select>
        </label>
        <label htmlFor="resource-status-reason">
          <span>{tr("ui.reason_1a51692b")}{reasonRequired.has(targetStatus) ? "*" : tr("ui.optional_45dc90f6")}</span>
          <textarea
            id="resource-status-reason"
            rows={4}
            maxLength={500}
            required={reasonRequired.has(targetStatus)}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={destructive ? tr("ui.explain_why_the_resource_is_02754c76") : tr("ui.describe_the_reason_or_operational_4675e7ef")}
          />
        </label>
        {destructive && <p className="resource-destructive-note">{tr("ui.the_resource_is_retained_with_860d628b")}</p>}
      </form>
    </BaseModal2026>
  );
};
