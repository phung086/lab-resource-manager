import bcrypt from "bcryptjs";
import crypto from "crypto";

export const safeUserSelect = Object.freeze({
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  department: true,
  studentId: true,
  phone: true
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
      studentId: input.studentId || null,
      department: input.department || null,
      phone: input.phone || null
    },
    select: safeUserSelect
  });
}
