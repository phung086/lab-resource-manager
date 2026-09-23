import React from "react";
import { BookingOperationsView } from "../../components/features/operations/BookingOperationsView.js";
import type { BookingRecord } from "../../types/booking.js";

export interface BookingOperationsPageProps {
  user: { id: string; role: string; fullName: string };
  onChanged?: () => void;
  onPayment?: (booking: BookingRecord) => void;
}

export const BookingOperationsPage: React.FC<BookingOperationsPageProps> = ({ user, onChanged, onPayment }) => {
  return <BookingOperationsView user={user} onChanged={onChanged} onPayment={onPayment} />;
};
