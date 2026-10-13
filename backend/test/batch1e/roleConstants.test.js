import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN, LAB_STAFF, CUSTOMER, CANONICAL_ROLES, STAFF_ROLES, SELF_SCOPE_ROLES, isCanonicalRole, isStaffRole } from '../../src/constants/roles.js';
test('Exactly three canonical roles; former academic roles and aliases are rejected', () => {
 assert.deepEqual(CANONICAL_ROLES, [ADMIN, LAB_STAFF, CUSTOMER]);
 assert.deepEqual(CANONICAL_ROLES, ['ADMIN','LAB_STAFF','CUSTOMER']);
 assert.deepEqual(STAFF_ROLES, ['ADMIN','LAB_STAFF']); assert.deepEqual(SELF_SCOPE_ROLES,['CUSTOMER']);
 for (const role of CANONICAL_ROLES) assert.equal(isCanonicalRole(role),true);
 for (const role of ['STUDENT','LECTURER','student','lecturer','customer','admin','INSTRUCTOR','RESEARCHER',null,undefined]) assert.equal(isCanonicalRole(role),false);
});
test('Customers never inherit operator privileges',()=>{
 assert.equal(isStaffRole('ADMIN'),true); assert.equal(isStaffRole('LAB_STAFF'),true); assert.equal(isStaffRole('CUSTOMER'),false);
});
