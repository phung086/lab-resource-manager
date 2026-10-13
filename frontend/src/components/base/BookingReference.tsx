import type { BookingRecord } from "../../types/booking";
import { useLocale } from "../../providers/LocaleProvider";

export function BookingReference({ booking }: { booking: Pick<BookingRecord, "id" | "bookingCode"> }) {
  const { tr } = useLocale();
  const reference = booking.bookingCode || booking.id;
  return <span className="booking-reference" title={reference} aria-label={`${tr("ui.booking_reference_e80792a6")}: ${reference}`}>
    {booking.bookingCode || booking.id.slice(0, 8)}
  </span>;
}
