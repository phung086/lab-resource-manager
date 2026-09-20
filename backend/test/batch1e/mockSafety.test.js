import assert from "node:assert/strict";
import test from "node:test";

import { requireAuth } from "../../src/middleware/auth.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test("requireAuth fails with 401 when Authorization header is missing", async () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "AUTH_REQUIRED");
});

test("requireAuth fails with 401 when Token format is invalid", async () => {
  const req = { headers: { authorization: "Basic some-token" } };
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "AUTH_REQUIRED");
});

test("requireAuth rejects invalid JWT signature with 401 AUTH_INVALID, never mockStore", async () => {
  const req = { headers: { authorization: "Bearer invalid.jwt.token" } };
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "AUTH_INVALID");
  assert.equal(req.user, undefined);
});
