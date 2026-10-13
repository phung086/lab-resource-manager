/**
 * Canonical role constants for the Lab Resource Manager.
 *
 * These are the ONLY valid human roles in the system.
 * No INSTRUCTOR, researcher, lowercase duplicate, or inferred alias is permitted.
 */

export const ADMIN = "ADMIN";
export const LAB_STAFF = "LAB_STAFF";
export const CUSTOMER = "CUSTOMER";

/** All canonical roles. */
export const CANONICAL_ROLES = [ADMIN, LAB_STAFF, CUSTOMER];

/** Roles with staff/administrative privileges. */
export const STAFF_ROLES = [ADMIN, LAB_STAFF];

/** Roles that can only access own-scoped data. */
export const SELF_SCOPE_ROLES = [CUSTOMER];

/**
 * Validates that a role string is one of the canonical values.
 * @param {string} role
 * @returns {boolean}
 */
export function isCanonicalRole(role) {
  return CANONICAL_ROLES.includes(role);
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}
