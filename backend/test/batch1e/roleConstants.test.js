import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN,
  LAB_STAFF,
  LECTURER,
  STUDENT,
  CANONICAL_ROLES,
  STAFF_ROLES,
  isCanonicalRole,
  isStaffRole
} from "../../src/constants/roles.js";

test("Canonical roles are uppercase and exactly 4 verified roles", () => {
  assert.equal(ADMIN, "ADMIN");
  assert.equal(LAB_STAFF, "LAB_STAFF");
  assert.equal(LECTURER, "LECTURER");
  assert.equal(STUDENT, "STUDENT");

  assert.deepEqual(CANONICAL_ROLES, ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"]);
  assert.deepEqual(STAFF_ROLES, ["ADMIN", "LAB_STAFF"]);
});

test("isCanonicalRole validates verified roles and rejects non-canonical values", () => {
  assert.equal(isCanonicalRole("ADMIN"), true);
  assert.equal(isCanonicalRole("LAB_STAFF"), true);
  assert.equal(isCanonicalRole("LECTURER"), true);
  assert.equal(isCanonicalRole("STUDENT"), true);

  // Lowercase legacy values must be rejected
  assert.equal(isCanonicalRole("admin"), false);
  assert.equal(isCanonicalRole("lab_staff"), false);
  assert.equal(isCanonicalRole("lecturer"), false);
  assert.equal(isCanonicalRole("student"), false);

  // Non-canonical inferred roles must be rejected
  assert.equal(isCanonicalRole("instructor"), false);
  assert.equal(isCanonicalRole("researcher"), false);
  assert.equal(isCanonicalRole("INSTRUCTOR"), false);
  assert.equal(isCanonicalRole("RESEARCHER"), false);
  assert.equal(isCanonicalRole(null), false);
  assert.equal(isCanonicalRole(undefined), false);
});

test("isStaffRole correctly identifies staff members", () => {
  assert.equal(isStaffRole("ADMIN"), true);
  assert.equal(isStaffRole("LAB_STAFF"), true);
  assert.equal(isStaffRole("LECTURER"), false);
  assert.equal(isStaffRole("STUDENT"), false);
});
