export const USER_ROLES = ['ADMIN', 'LAB_STAFF', 'CUSTOMER'] as const;
export type UserRole = typeof USER_ROLES[number];
export function validateManagedUser(values: { fullName: string; email: string; password: string; role: string }) {
  const errors: Record<string, string> = {};
  const data = { fullName: values.fullName.trim(), email: values.email.trim().toLowerCase(), password: values.password, role: values.role };
  if (data.fullName.length < 2 || data.fullName.length > 255) errors.fullName = 'ui.users.nameLength';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'ui.users.emailInvalid';
  if (data.password.length < 12 || data.password.length > 128) errors.password = 'ui.users.passwordLength';
  if (!USER_ROLES.includes(data.role as UserRole)) errors.role = 'ui.users.roleRequired';
  return { errors, data: Object.keys(errors).length ? null : data };
}
