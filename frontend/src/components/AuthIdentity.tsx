import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React from "react";
import { CalendarCheck, Search, ClipboardCheck, FlaskConical } from "lucide-react";

export function AuthIdentity({ registration = false }: { registration?: boolean }) {
  const { tr } = useLocale();
  return <div className="auth-panel auth-panel-identity identity-composition">
    <div className="identity-brand"><FlaskConical size={28} aria-hidden="true" /><strong>{translate("ui.lab_resource_manager_a57ea8d6")}</strong></div>
    <div className="identity-message"><h2>{registration ? tr("ui.prepare_for_your_next_practical_640681f4") : tr("ui.the_right_resources_a_clear_3bc618cd")}</h2><p>{tr("ui.from_finding_a_room_and_0f3217ec")}</p></div>
    <ol className="identity-journey"><li><Search size={17} aria-hidden="true" />{tr("ui.find_a_resource_2d5d3f8f")}</li><li><CalendarCheck size={17} aria-hidden="true" />{tr("ui.book_a_resource_729e485c")}</li><li><ClipboardCheck size={17} aria-hidden="true" />{tr("ui.checked_out_f1abd0bf")}</li></ol>
    <footer className="auth-identity-footer">{registration ? tr("ui.customer.registrationHint") : tr("ui.customer.audience")}</footer>
  </div>;
}
