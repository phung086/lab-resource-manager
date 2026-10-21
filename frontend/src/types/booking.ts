export type BookingStatus =
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "CHECKED_OUT"
  | "RETURNED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type BookingAction = "APPROVE" | "REJECT" | "CHECK_OUT" | "RETURN" | "COMPLETE" | "SELF_RETURN";

export interface BookingUserSummary {
  id: string;
  fullName: string;
  email?: string;
  role: string;
}

export interface BookingResourceSummary {
  id: string;
  code: string;
  name: string;
  laboratoryId?: string | null;
  operationalStatus?: string;
  category?: string | null;
  laboratory?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface BookingRecord {
  paymentDueAt?: string | null;
  fulfillmentSnapshot?: { mode: string; pickupInstructions?: string; address?: { fullAddress: string }; deliveryFeeVnd?: number } | null;
  schedulingReleasedAt?: string | null;
  contactSnapshot?: { fullName: string; phone: string; email: string } | null;
  feeAmountVnd?: number;
  feeSnapshot?: { baseAmountVnd?: number; discountAmountVnd?: number; discountBps?: number; loyaltyTier?: string; loyaltyPolicyVersion?: number; amountVnd?: number } | null;
  id: string;
  bookingCode?: string | null;
  resourceId: string;
  requestedById: string;
  approvedById?: string | null;
  title: string;
  purpose?: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  notes?: string | null;
  handoverCondition?: string | null;
  returnCondition?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  approvedAt?: string | null;
  returnedAt?: string | null;
  completedAt?: string | null;
  physicalStateWarning?: string | null;
  physicalStateWarningKey?: string;
  physicalStateWarningParams?: { status: string };
  resource: BookingResourceSummary;
  requestedBy: BookingUserSummary;
  approvedBy?: BookingUserSummary | null;
}

export interface BookingHistoryEvent {
  id: string;
  bookingId?: string | null;
  action: string;
  fromStatus?: BookingStatus | null;
  toStatus?: BookingStatus | null;
  reason?: string | null;
  conditionBefore?: string | null;
  conditionAfter?: string | null;
  actor?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BookingHistoryResponse {
  booking: BookingRecord;
  timeline: BookingHistoryEvent[];
}

export interface BookingActionPayload {
  reason?: string;
  conditionBefore?: string;
  conditionAfter?: string;
}
