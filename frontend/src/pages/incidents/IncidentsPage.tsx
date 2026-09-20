import React from "react";
import { IncidentManagementView } from "../../components/features/incidents/IncidentManagementView";
import type { IncidentRecord } from "../../types/incident";

interface Props {
  user: { id?: string; role: string } | null;
  resources: Array<{ id: string; code: string; name: string; operationalStatus?: string }>;
  incidents: IncidentRecord[];
  onChanged?: () => Promise<void> | void;
}

export const IncidentsPage: React.FC<Props> = (props) => <IncidentManagementView {...props} />;
