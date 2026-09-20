import { apiRequest } from "../api.js";
import type {
  BookingAction,
  BookingActionPayload,
  BookingHistoryResponse,
  BookingRecord
} from "../types/booking.js";

const ACTION_ENDPOINT: Record<BookingAction, string> = {
  APPROVE: "approve",
  REJECT: "reject",
  CHECK_OUT: "check-out",
  RETURN: "return",
  COMPLETE: "complete"
};

export async function listOperationalBookings(): Promise<BookingRecord[]> {
  return apiRequest("/bookings");
}

export async function getBookingHistory(bookingId: string): Promise<BookingHistoryResponse> {
  return apiRequest(`/bookings/${bookingId}/history`);
}

export async function performBookingAction(
  bookingId: string,
  action: BookingAction,
  payload: BookingActionPayload
): Promise<BookingRecord> {
  return apiRequest(`/bookings/${bookingId}/${ACTION_ENDPOINT[action]}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function cancelOwnBooking(bookingId: string, reason?: string): Promise<BookingRecord> {
  return apiRequest(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {})
  });
}
