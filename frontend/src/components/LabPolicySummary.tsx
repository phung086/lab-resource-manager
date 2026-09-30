import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React from "react";

interface LabPolicy {
  workDayStartHour?: number | null;
  workDayEndHour?: number | null;
  minBookingMinutes?: number | null;
  maxBookingMinutes?: number | null;
  maxAdvanceBookingDays?: number | null;
  allowWeekend?: boolean | null;
}

export function LabPolicySummary({ policy, requiresApproval }: { policy?: LabPolicy | null; requiresApproval?: boolean }) {
  const { tr } = useLocale();
  const unknown = tr("ui.no_information_b1ca3344");
  const duration = (minutes?: number | null) => minutes == null ? unknown : translate("ui.minutes_93e63a9e", { value0: minutes });
  const hours = policy?.workDayStartHour != null && policy?.workDayEndHour != null
    ? translate("ui.00_00_vietnam_time_6e1291ef", { value0: String(policy.workDayStartHour).padStart(2, "0"), value1: String(policy.workDayEndHour).padStart(2, "0") }) : unknown;
  const entries = [
    [tr("ui.opening_hours_d7cc3448"), hours],
    [tr("ui.minimum_duration_3734302d"), duration(policy?.minBookingMinutes)],
    [tr("ui.maximum_duration_aa77487c"), duration(policy?.maxBookingMinutes)],
    [tr("ui.advance_booking_limit_b57c91dd"), policy?.maxAdvanceBookingDays == null ? unknown : translate("ui.days_62f408a1", { value0: policy.maxAdvanceBookingDays })],
    [tr("ui.saturday_sunday_c5351448"), policy?.allowWeekend == null ? unknown : policy.allowWeekend ? tr("ui.bookings_allowed_63479843") : tr("ui.bookings_not_allowed_0d5af69d")],
    [tr("ui.approve_e94fc148"), requiresApproval == null ? unknown : requiresApproval ? tr("ui.authorized_staff_approval_required_5027029a") : tr("ui.confirm_when_policy_checks_pass_ca70c307")],
  ];
  return <section className="lab-policy-summary" aria-label={tr("ui.laboratory_booking_policy_37816f8d")}>
    <h4>{tr("ui.laboratory_booking_policy_37816f8d")}</h4>
    <dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{tr("ui.time_slots_also_depend_on_acd0f9f3")}</p>
  </section>;
}
