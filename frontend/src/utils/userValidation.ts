export const USER_ROLES = ['ADMIN', 'LAB_STAFF', 'CUSTOMER'] as const;
export type UserRole = typeof USER_ROLES[number];
export function validateManagedUser(values: { fullName: string; email: string; password: string; role: string; phone?: string; organization?: string }, actorRole: string = 'ADMIN') {
  const errors: Record<string, string> = {};
  const data = { fullName: values.fullName.trim(), email: values.email.trim().toLowerCase(), password: values.password, role: values.role };
  if (data.fullName.length < 2 || data.fullName.length > 255) errors.fullName = 'ui.users.nameLength';
  if (!/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i.test(data.email)) errors.email = 'ui.users.emailInvalid';
  if (data.password.length < 12 || data.password.length > 128) errors.password = 'ui.users.passwordLength';
  if (!USER_ROLES.includes(data.role as UserRole)) errors.role = 'ui.users.roleRequired';
  else if (actorRole !== 'ADMIN' && (actorRole !== 'LAB_STAFF' || data.role !== 'CUSTOMER')) errors.role = 'ui.users.roleRequired';
  const contact = validateManagedUserEdit({ fullName: values.fullName, phone: values.phone || '', organization: values.organization || '' });
  Object.assign(errors, contact.errors);
  return { errors, data: Object.keys(errors).length ? null : { ...data, ...contact.data } };
}

export function validateManagedUserEdit(values: { fullName: string; phone: string; organization: string }) {
  const data = { fullName: values.fullName.trim(), phone: values.phone.trim(), organization: values.organization.trim() }, errors: Record<string,string> = {};
  if (data.fullName.length < 2 || data.fullName.length > 255) errors.fullName = 'ui.users.nameLength';
  if (data.phone && !/^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(data.phone)) errors.phone = 'ui.customer.phoneInvalid';
  if (data.organization.length > 160) errors.organization = 'ui.account.organizationLength';
  return { errors, data: Object.keys(errors).length ? null : data };
}

export function managedUserServerFields(cause: { code?: string; details?: { field?: string; fieldErrors?: Record<string,unknown[]> } }) {
  if (cause?.code === 'DUPLICATE_EMAIL') return { email: 'ui.email_already_registered_please_login_4d3e2f1a' };
  if (cause?.code !== 'VALIDATION_ERROR') return {};
  const labels: Record<string,string> = { fullName: 'ui.users.nameLength', email: 'ui.users.emailInvalid', password: 'ui.users.passwordLength', role: 'ui.users.roleRequired', phone: 'ui.customer.phoneInvalid', organization: 'ui.account.organizationLength' };
  return Object.fromEntries(Object.entries(labels).filter(([field]) => cause.details?.field === field || cause.details?.fieldErrors?.[field]?.length));
}
