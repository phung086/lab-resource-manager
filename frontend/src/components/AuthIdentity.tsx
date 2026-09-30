import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React from "react";
import { CalendarCheck, Search, ClipboardCheck, ArrowRight } from "lucide-react";

export function AuthIdentity({ registration = false }: { registration?: boolean }) {
  const { tr } = useLocale();
  return <div className="auth-panel auth-panel-identity identity-composition">
    <div className="identity-brand"><CalendarCheck size={25} aria-hidden="true" /><strong>{translate("ui.lab_resource_manager_a57ea8d6")}</strong></div>
    <div className="identity-message"><h1>{registration ? tr("ui.prepare_for_your_next_practical_640681f4") : tr("ui.the_right_resources_a_clear_3bc618cd")}</h1><p>{tr("ui.from_finding_a_room_and_0f3217ec")}</p></div>
    <svg className="lab-plan-illustration" viewBox="0 0 400 150" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="398" height="148" rx="12" stroke="currentColor" />
      <path d="M132 1v148M266 1v148M1 109h398" stroke="currentColor" />
      <rect x="28" y="29" width="76" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M66 79v12M50 91h32M43 43h19M43 53h40M43 63h29" stroke="currentColor" strokeWidth="2" />
      <rect x="166" y="23" width="65" height="66" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M166 45h65M166 67h65M180 34h9M180 56h9M180 78h9" stroke="currentColor" strokeWidth="2" />
      <path d="M315 26h32M320 26v30l-16 28a5 5 0 0 0 4 7h46a5 5 0 0 0 4-7l-16-28V26M313 73h36" stroke="currentColor" strokeWidth="2" />
      <path d="M28 128h76M166 128h65M304 128h54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <ol className="identity-journey"><li><Search size={17} aria-hidden="true" />{tr("ui.find_a_resource_2d5d3f8f")}<ArrowRight size={14} aria-hidden="true" /></li><li><CalendarCheck size={17} aria-hidden="true" />{tr("ui.book_a_resource_729e485c")}<ArrowRight size={14} aria-hidden="true" /></li><li><ClipboardCheck size={17} aria-hidden="true" />{tr("ui.checked_out_f1abd0bf")}</li></ol>
    <footer className="auth-identity-footer">{registration ? tr("ui.new_accounts_have_the_student_9d1d6a77") : tr("ui.for_students_lecturers_and_laboratory_fe72933f")}</footer>
  </div>;
}
