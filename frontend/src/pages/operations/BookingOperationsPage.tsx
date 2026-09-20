import React from "react";
import { BookingOperationsView } from "../../components/features/operations/BookingOperationsView.js";

export interface BookingOperationsPageProps {
  user: { id: string; role: string; fullName: string };
  onChanged?: () => void;
}

export const BookingOperationsPage: React.FC<BookingOperationsPageProps> = ({ user, onChanged }) => {
  return <BookingOperationsView user={user} onChanged={onChanged} />;
};
