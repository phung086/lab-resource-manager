import React from 'react';
import { MaterialsWorkspaceView } from '../components/features/materials/MaterialsWorkspaceView';
import type { MaterialMaintenance } from '../utils/materialValidation';
type Props = { locale: string; user: { id: string; role: string }; maintenance?: MaterialMaintenance[] };
export function StockPage({ user, maintenance = [] }: Props) {
  return <MaterialsWorkspaceView user={user} maintenance={maintenance} />;
}
