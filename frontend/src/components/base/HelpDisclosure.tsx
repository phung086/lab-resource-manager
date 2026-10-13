import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { useLocale } from "../../providers/LocaleProvider";
import "../../styles/help-disclosure.css";

/** Optional guidance stays out of the main task; errors and required fields stay visible. */
export function HelpDisclosure({ children }: { children: ReactNode }) {
  const { tr } = useLocale();
  return <details className="help-disclosure">
    <summary><CircleHelp size={15} aria-hidden="true" />{tr("ui.help.instructions")}</summary>
    <div className="help-disclosure-content">{children}</div>
  </details>;
}
