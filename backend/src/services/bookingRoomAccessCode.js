// Use the immutable booking contact, never the caller's current profile or a
// shared resource password. This code is only returned by the owner-only API.
export function bookingRoomAccessCode(booking) {
  const phone = booking?.contactSnapshot?.phone;
  if (typeof phone !== 'string') return null;
  const normalized = phone.trim().replace(/[\s().-]/g, '');
  if (!/^(?:0\d{9}|\+[1-9]\d{8,14})$/.test(normalized)) return null;
  return normalized.replace(/^\+/, '');
}
