import type { BookingAction, BookingRecord } from "../types/booking";

// Presentation eligibility only. The API remains authoritative for permission,
// prerequisites, booking state and laboratory scope on every submission.
export function canOpenBookingAction(booking: BookingRecord, action: string, user: { id: string; role: string }): action is BookingAction {
  if (action === "SELF_RETURN") return booking.requestedById === user.id && booking.resource?.category === "ROOM" && booking.status === "CHECKED_OUT";
  if (!["ADMIN", "LAB_STAFF"].includes(user.role)) return false;
  const states: Partial<Record<BookingAction, string>> = { APPROVE: "PENDING_APPROVAL", REJECT: "PENDING_APPROVAL", CHECK_OUT: "CONFIRMED", RETURN: "CHECKED_OUT", COMPLETE: "RETURNED" };
  return Boolean(states[action]) && states[action] === booking.status;
}
