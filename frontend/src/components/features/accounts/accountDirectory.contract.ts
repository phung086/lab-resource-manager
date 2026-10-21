// Shared types and key constants for the user-management directory flow.
// Imported by UserDirectoryList, AccountDetailPanel, AccountAccessPanel,
// UserCreatePanel and the AccessUserManagement shell so the canonical role
// labels and field-group keys live in exactly one place.

export type UserRole = 'ADMIN' | 'LAB_STAFF' | 'CUSTOMER';

export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'LAB_STAFF', 'CUSTOMER'] as const;

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'ui.administrator_d00831ec',
  LAB_STAFF: 'ui.lab_staff_1b410267',
  CUSTOMER: 'core.roles.customer',
};

export type DirectoryUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  organization?: string | null;
  department?: string | null;
  deletedAt?: string | null;
  _count?: { bookings: number };
};

export type Laboratory = { id: string; code: string; name: string; isActive: boolean };
export type Assignment = { laboratoryId: string; laboratory: Laboratory };
