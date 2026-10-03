import React from "react";
import { useLocale } from "../../providers/LocaleProvider";

const choices = [
  { locale: "vi", label: "ui.vi_dc7b94e1", title: "ui.vietnamese_690829f8" },
  { locale: "en", label: "ui.en_69374b09", title: "ui.english_ba118bf7" }
];

export function LanguageToggle() {
  const { locale, changeLocale, loadingLocale, t } = useLocale();
  return (
    <div className="segmented-control-2026" role="group" aria-label={t("ui.language_selector_385e1c32")}>
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
          {t(choice.label)}
        </button>
      ))}
    </div>
  );
}
