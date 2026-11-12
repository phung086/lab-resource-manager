import React from "react";
import { AuditLogsView } from "../components/features/audit/AuditLogsView";

interface AuditLogsPageProps {
  actorRole: string;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ actorRole }) => (
  <AuditLogsView actorRole={actorRole} />
);
