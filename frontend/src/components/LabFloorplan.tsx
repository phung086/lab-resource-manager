import React from "react";
import { DigitalTwinHeatmap } from "./DigitalTwinHeatmap.tsx";

export interface LabFloorplanProps {
  resources?: any[];
  onSelectResource?: (resource: any) => void;
}

export const LabFloorplan: React.FC<LabFloorplanProps> = ({
  resources = [],
  onSelectResource
}) => {
  return (
    <div className="lab-floorplan-container-2026">
      <DigitalTwinHeatmap
        onSelectNode={(nodeId) => {
          if (onSelectResource) {
            const found = resources.find((r) => r.code === nodeId || r.id === nodeId);
            onSelectResource(found || { code: nodeId, name: nodeId });
          }
        }}
      />
    </div>
  );
};
