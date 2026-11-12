import React from "react";
import { StatusBadge, type StatusTone } from '../../base/StatusBadge';

import { useLocale } from "../../../providers/LocaleProvider";

const resourceStatusLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d",
  IN_USE: "ui.in_use_a07a3647",
  MAINTENANCE: "ui.maintenance_8ad424bd",
  CALIBRATION: "ui.calibration_a71e17c8",
  BROKEN: "ui.broken_fd69bba6",
  RETIRED: "ui.retired_910c0237",
  OFFLINE: "ui.offline_96a8bb03",
  RESERVED: "ui.reserved_837420a4",
  RESTRICTED: "ui.restricted_booking_1e5b50c0",
  UNAVAILABLE: "ui.unavailable_567f82dd"
};

const tones: Record<string, StatusTone> = { AVAILABLE:'positive', IN_USE:'info', RESERVED:'info', MAINTENANCE:'attention', CALIBRATION:'violet', BROKEN:'danger', RETIRED:'neutral', OFFLINE:'neutral', RESTRICTED:'attention', UNAVAILABLE:'neutral' };

export function StatusPill({ value, label }: { value: string; label?: string }) {
  const { tr } = useLocale();
  return <StatusBadge className={`resource-status-pill status-${String(value).toLowerCase()}`} tone={tones[value] || 'neutral'}>{label || (resourceStatusLabels[value] ? tr(resourceStatusLabels[value]) : value)}</StatusBadge>;
}
