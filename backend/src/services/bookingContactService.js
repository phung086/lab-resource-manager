import { z } from 'zod';
import { HttpError } from '../middleware/errors.js';
import { CUSTOMER } from '../constants/roles.js';

export const bookingContactSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().regex(/^(?:0\d{9}|\+[1-9]\d{7,14})$/)
}).strict();

// Validate saved contact too: email-only registration never invents a name/phone.
// Caller owns the transaction, so a failed booking cannot save a partial profile.
export async function bookingContact(tx, userId, supplied) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, 'Account not found', undefined, 'AUTH_INVALID');
  if (user.role !== CUSTOMER && !supplied) return null;
  const parsed = bookingContactSchema.safeParse(supplied || { fullName: user.fullName, phone: user.phone || '' });
  if (!parsed.success) {
    throw new HttpError(400, 'Complete your booking contact', { fieldErrors: parsed.error.flatten().fieldErrors }, 'BOOKING_CONTACT_REQUIRED');
  }
  if (supplied) await tx.user.update({ where: { id: userId }, data: parsed.data });
  return { ...parsed.data, email: user.email };
}
