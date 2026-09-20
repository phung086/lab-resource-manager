import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN, LAB_STAFF, STUDENT } from "../../src/constants/roles.js";
import { requireLabAccess } from "../../src/middleware/labScope.js";

test("requireLabAccess allows ADMIN unconditionally", async () => {
  const middleware = requireLabAccess("params.id");
  const req = {
    user: { id: "admin-1", role: ADMIN },
    params: { id: "any-resource-id" }
  };
  let nextCalled = false;
  await middleware(req, {}, (err) => {
    assert.equal(err, undefined);
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test("requireLabAccess rejects non-staff roles with 403 FORBIDDEN", async () => {
  const middleware = requireLabAccess("params.id");
  const req = {
    user: { id: "student-1", role: STUDENT },
    params: { id: "any-resource-id" }
  };
  let errorReceived = null;
  await middleware(req, {}, (err) => {
    errorReceived = err;
  });
  assert.ok(errorReceived);
  assert.equal(errorReceived.status, 403);
  assert.equal(errorReceived.code, "FORBIDDEN");
});

test("requireLabAccess rejects unauthenticated requests with 401", async () => {
  const middleware = requireLabAccess("params.id");
  const req = {
    user: null,
    params: { id: "any-resource-id" }
  };
  let errorReceived = null;
  await middleware(req, {}, (err) => {
    errorReceived = err;
  });
  assert.ok(errorReceived);
  assert.equal(errorReceived.status, 401);
  assert.equal(errorReceived.code, "AUTH_REQUIRED");
});
