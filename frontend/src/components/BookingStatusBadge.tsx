import { useLocale } from '../providers/LocaleProvider';
import { STATUS_CONFIG } from './bookingStatusTokens';
import { StatusBadge, type StatusTone } from './base/StatusBadge';

export interface BookingStatusBadgeProps {
  status?: string;
  paymentDueAt?: string | null;
  occupancy?: string;
  className?: string;
}
const statusTones: Record<string, StatusTone> = {
  PENDING_APPROVAL:'attention', CONFIRMED:'positive', CHECKED_OUT:'info', RETURNED:'violet', COMPLETED:'neutral', REJECTED:'danger', CANCELLED:'neutral',
  pending:'attention', approved:'positive', checked_out:'info', completed:'neutral', rejected:'danger', cancelled:'neutral',
};
const occupancyLabels: Record<string, string> = { BOOKED:'ui.reserved_f20b6ee2', MAINTENANCE:'ui.maintenance_8ad424bd', AVAILABLE:'ui.available_b99ed3dd' };
const occupancyTones: Record<string, StatusTone> = { BOOKED:'info', MAINTENANCE:'attention', AVAILABLE:'positive' };

export function BookingStatusBadge({ status, paymentDueAt, occupancy, className = '' }: BookingStatusBadgeProps) {
  const { tr } = useLocale();
  if (status && STATUS_CONFIG[status]) {
    const label = status === 'PENDING_APPROVAL' && paymentDueAt ? 'ui.paymentHold.pending' : STATUS_CONFIG[status].label;
    return <StatusBadge className={`status-badge-inline ${className}`} tone={statusTones[status] || 'neutral'}>{tr(label)}</StatusBadge>;
  }
  if (occupancy && occupancyLabels[occupancy]) return <StatusBadge className={`occupancy-badge-inline ${className}`} tone={occupancyTones[occupancy]}>{tr(occupancyLabels[occupancy])}</StatusBadge>;
  return status ? <StatusBadge className={`status-badge-inline ${className}`}>{status}</StatusBadge> : null;
}
