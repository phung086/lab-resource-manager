import bcrypt from "bcryptjs";
import crypto from "crypto";

export const safeUserSelect = Object.freeze({
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  phone: true,
  passwordResetRequired: true,
  defaultAddressLine: true,
  defaultAddressProvinceCode: true,
  defaultAddressProvinceName: true,
  defaultAddressWardCode: true,
  defaultAddressWardName: true,
  defaultAddressSource: true,
  defaultAddressVersion: true,
  loyaltyTier: true,
  loyaltyPoints: true,
  loyaltyDiscountBps: true,
  priorityBoost: true
});

export async function createManagedUser(client, input) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  return client.user.create({
    data: {
      id: crypto.randomUUID(),
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      isActive: input.isActive,
      phone: input.phone || null
    },
    select: safeUserSelect
  });
}
