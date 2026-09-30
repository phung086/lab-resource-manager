import React from 'react';
import { BookOpen, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import '../styles/resource-media.css';

export type UsageGuide = {
  beforeUse?: string[];
  steps?: string[];
  afterUse?: string[];
  safetyNotes?: string;
};

export function ResourceUsageGuide({ guide }: { guide?: UsageGuide }) {
  const { t } = useLocale();
  const sections = [
    { key: 'beforeUse', title: t("ui.before_handover_85b38e1e"), rows: guide?.beforeUse },
    { key: 'steps', title: t("ui.operating_steps_e6960515"), rows: guide?.steps },
    { key: 'afterUse', title: t("ui.before_returning_ccea2bd1"), rows: guide?.afterUse }
  ];
  const hasGuide = sections.some(section => Array.isArray(section.rows) && section.rows.length) || Boolean(guide?.safetyNotes);
  return <section className="resource-usage-guide" aria-label={t("ui.usage_guide_28e5af8d")}>
    <div className="resource-guide-heading"><BookOpen size={20} aria-hidden="true" /><h4>{t("ui.usage_guide_28e5af8d")}</h4></div>
    {hasGuide ? <>
      <p className="resource-guide-note">{t("ui.instructions_supplied_by_the_managing_f208a080")}</p>
      {sections.map(section => Array.isArray(section.rows) && section.rows.length > 0 && <details key={section.key} open>
        <summary>{section.title}<span>{section.rows.length} {t("ui.steps_2313c786")}</span></summary>
        <ol>{section.rows.map((step, index) => <li key={index}>{step}</li>)}</ol>
      </details>)}
      {guide?.safetyNotes && <div className="resource-guide-safety"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t("ui.safety_notes_4d6fcfbc")}</strong><p>{guide.safetyNotes}</p></div></div>}
    </> : <p className="resource-guide-note">{t("ui.operating_instructions_have_not_been_ee770ae8")}</p>}
    <details className="resource-guide-workflow">
      <summary><ClipboardCheck size={17} aria-hidden="true" />{t("ui.borrowing_return_process_d280855d")}</summary>
      <ol>
        <li>{t("ui.choose_a_time_check_training_7f67282f")}</li>
        <li>{t("ui.at_handover_check_accessories_and_f1d8d9a3")}</li>
        <li>{t("ui.during_use_follow_the_equipment_e372387c")}</li>
        <li>{t("ui.return_on_time_and_record_e0a19652")}</li>
      </ol>
    </details>
  </section>;
}
