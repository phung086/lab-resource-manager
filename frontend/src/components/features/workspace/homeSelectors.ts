import type { BookingRecord } from "../../../types/booking";
import type { RoleHomeProps } from "./homeTypes";

export const ownBookings = (props: RoleHomeProps) => props.bookings.filter(row => row.requestedById === props.user.id);
export const upcomingBookings = (rows: BookingRecord[]) => rows.filter(row => ["CONFIRMED", "CHECKED_OUT"].includes(row.status) && new Date(row.endAt).getTime() > Date.now()).sort((a, b) => a.status === b.status ? a.startAt.localeCompare(b.startAt) : a.status === "CHECKED_OUT" ? -1 : 1);
