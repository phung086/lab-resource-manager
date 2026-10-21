import React, { useState } from "react";
import { PolicyEditor } from './features/planning/PolicyEditor';
import '../styles/planning-workspace.css';
import { translate as t } from "../i18n.js";
import { readRouteParams } from "../workspaceRoutes.js";
import { ResourceManagementView } from "./ResourceManagementView.tsx";
import type { BookingQueueSummary, IncidentQueueSummary } from "../types/queue";

interface AdminResourceConsoleProps {
  user: { id: string; role: "ADMIN" | "LAB_STAFF" };
  initialClassification?: string;
  bookingSummary: BookingQueueSummary | null;
  incidentSummary: IncidentQueueSummary | null;
  dashboard?: { summary: { totalResources: number; criticalIncidentCount: number } } | null;
  incidents: { id: string; title: string; status: string; severity?: string; resource?: { name?: string } }[];
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

// Pass navigation filters into the real query, not just the selected button.
export const AdminResourceConsole: React.FC<AdminResourceConsoleProps> = (props) => {
  const [showPolicy, setShowPolicy] = useState(false);
  const params = Object.fromEntries(readRouteParams());
  const unresolved = params.classification === "UNRESOLVED";
  const broken = params.operationalStatus === "BROKEN";
  return (
    <div className="admin-resource-console" data-scope="admin">
      <nav className="resource-management-sections" aria-label={t("ui.admin.console.filterList")}>
        <button type="button" aria-pressed={!unresolved && !broken} onClick={() => props.onNavigate?.("admin_management", {})}>{t("ui.all_49c73a31")}</button>
        <button type="button" aria-pressed={unresolved} onClick={() => props.onNavigate?.("admin_management", { classification: "UNRESOLVED", filtersOpen: "true" })}>{t("ui.admin.console.unresolved")}</button>
        <button type="button" aria-pressed={broken} onClick={() => props.onNavigate?.("admin_management", { operationalStatus: "BROKEN", filtersOpen: "true" })}>{t("ui.admin.console.broken")}</button>
      </nav>
      {props.user.role === 'ADMIN' && <details className="planning-workspace" open={showPolicy} onToggle={event => setShowPolicy(event.currentTarget.open)}>
        <summary>{t('planning.policy')}</summary>
        {showPolicy && <PolicyEditor/>}
      </details>}
      <ResourceManagementView user={props.user} managementMode initialClassification={props.initialClassification} initialQuery={params} />
    </div>
  );
};
