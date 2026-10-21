import React from "react";

import { ResourceManagementView } from "./ResourceManagementView.tsx";

export interface AdminResourceManagementViewProps {
  initialClassification?: string;
  user: {
    id: string;
    role: "ADMIN" | "LAB_STAFF";
  };
}

export const AdminResourceManagementView: React.FC<AdminResourceManagementViewProps> = ({ user, initialClassification }) => {
 return <>
  <ResourceManagementView user={user} managementMode initialClassification={initialClassification} />
 </>;
};
