import React from "react";
import { useLocale } from "../../providers/LocaleProvider";

const choices = [
  { locale: "vi", label: "ui.vi_dc7b94e1", title: "ui.vietnamese_690829f8" },
  { locale: "en", label: "ui.en_69374b09", title: "ui.english_ba118bf7" }
];

export function LanguageToggle({ className = "", labelKey = "ui.language_selector_385e1c32" }: { className?: string; labelKey?: string } = {}) {
  const { locale, changeLocale, loadingLocale, t } = useLocale();
  return (
    <div className={`segmented-control-2026 studio-language ${className}`} role="group" aria-label={t(labelKey)}>
      {choices.map(choice => (
        <button
          key={choice.locale}
          type="button"
          className={`segmented-btn-2026 ${locale === choice.locale ? "is-active" : ""}`}
          onClick={() => void changeLocale(choice.locale)}
          disabled={Boolean(loadingLocale)}
          aria-pressed={locale === choice.locale}
          title={t(choice.title)}
        >
          <img className="studio-language-flag" src={`/flags/${choice.locale}.svg`} alt="" width="16" height="12" />
          {t(choice.label)}
        </button>
      ))}
    </div>
  );
}
