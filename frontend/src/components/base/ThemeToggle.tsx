import { Moon, Sun } from "lucide-react";
import { useLocale } from "../../providers/LocaleProvider";
import { useTheme } from "../../providers/ThemeProvider";

export function ThemeToggle() {
  const { t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = t(dark ? "ui.theme.light" : "ui.theme.dark");
  const Icon = dark ? Sun : Moon;
  return <button type="button" className="studio-theme-toggle" aria-label={label} title={label} onClick={toggleTheme}>
    <Icon size={18} aria-hidden="true" />
  </button>;
}
