import React from "react";

import { ResourceManagementView } from "./ResourceManagementView.tsx";

export interface AdminResourceManagementViewProps {
  user: {
    id: string;
    role: "ADMIN" | "LAB_STAFF";
  };
}

export const AdminResourceManagementView: React.FC<AdminResourceManagementViewProps> = ({ user }) => (
  <ResourceManagementView user={user} managementMode />
);
