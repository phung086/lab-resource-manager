import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

import {
  configureBatch7TestEnvironment,
  isolatedBatch7Client
} from "./helpers/batch7Database.js";

const database = process.env.BATCH7_DATABASE;
if (!database) {
  throw new Error("BATCH7_DATABASE is required");
}

const databaseUrl = await configureBatch7TestEnvironment(database);
const prisma = isolatedBatch7Client(databaseUrl);

const { createApp } = await import("../src/app.js");
const { config } = await import("../src/config.js");

const app = createApp();

const ids = {
  campus: "b7100000-0000-4000-8000-000000000001",
  building: "b7100000-0000-4000-8000-000000000002",
  lab: "b7100000-0000-4000-8000-000000000003",
  admin: "b7100000-0000-4000-8000-000000000004",
  student: "b7100000-0000-4000-8000-000000000005"
};

const password = "Batch7E2E!Passphrase";

function bearer(user) {
  return {
    Authorization: `Bearer ${jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
      algorithm: "HS256",
      expiresIn: "1h"
    })}`
  };
}

async function seed() {
  await prisma.notification.deleteMany();
  await prisma.usageLog.deleteMany();
  await prisma.userLabAssignment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.labPolicy.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.building.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.user.deleteMany();

  await prisma.campus.create({ data: { id: ids.campus, code: "B7-CAMPUS", name: "Batch 7 Campus" } });
  await prisma.building.create({ data: { id: ids.building, campusId: ids.campus, code: "B7-BLDG", name: "Batch 7 Building" } });
  await prisma.laboratory.create({
    data: { id: ids.lab, buildingId: ids.building, code: "B7-LAB", name: "Batch 7 Lab", isActive: true }
  });

  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        email: "b7.admin@lab.test",
        fullName: "Batch 7 Admin",
        role: "ADMIN",
        passwordHash,
        isActive: true
      },
      {
        id: ids.student,
        email: "b7.student@lab.test",
        fullName: "Batch 7 Student",
        role: "STUDENT",
        passwordHash,
        isActive: true
      }
    ]
  });
}

await seed();

test("Batch 7 production demo hardening", async (t) => {
  await t.test("ADMIN can create a canonical persisted user", async () => {
    const admin = await prisma.user.findUnique({ where: { id: ids.admin } });
    const response = await request(app)
      .post("/api/users")
      .set(bearer(admin))
      .send({
        email: "created.staff@lab.test",
        password: "CreatedStaff!Passphrase",
        fullName: "Created Lab Staff",
        role: "LAB_STAFF"
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.role, "LAB_STAFF");
    assert.equal(response.body.email, "created.staff@lab.test");
    assert.equal("passwordHash" in response.body, false);

    const persisted = await prisma.user.findUnique({ where: { email: "created.staff@lab.test" } });
    assert.ok(persisted);
    assert.equal(persisted.role, "LAB_STAFF");
    assert.equal(await bcrypt.compare("CreatedStaff!Passphrase", persisted.passwordHash), true);
  });

  await t.test("ordinary users cannot create privileged users", async () => {
    const student = await prisma.user.findUnique({ where: { id: ids.student } });
    const response = await request(app)
      .post("/api/users")
      .set(bearer(student))
      .send({
        email: "forbidden.admin@lab.test",
        password: "ForbiddenAdmin!Passphrase",
        fullName: "Forbidden Admin",
        role: "ADMIN"
      });

    assert.equal(response.status, 403);
    assert.equal(await prisma.user.count({ where: { email: "forbidden.admin@lab.test" } }), 0);
  });

  await t.test("duplicate admin-created email fails explicitly", async () => {
    const admin = await prisma.user.findUnique({ where: { id: ids.admin } });
    const response = await request(app)
      .post("/api/users")
      .set(bearer(admin))
      .send({
        email: "created.staff@lab.test",
        password: "AnotherStrong!Passphrase",
        fullName: "Duplicate Staff",
        role: "LAB_STAFF"
      });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "DUPLICATE_EMAIL");
  });

  await t.test("optional payment and AI routes remain outside required core", async () => {
    for (const path of ["/api/payments", "/api/ai", "/api/assistant"]) {
      const response = await request(app).get(path);
      assert.equal(response.status, 404, `${path} must remain unmounted in required core`);
    }
  });

  await t.test("readiness performs a live PostgreSQL probe", async () => {
    const response = await request(app).get("/health/ready");
    assert.equal(response.status, 200);
    assert.equal(response.body.database, "ready");
  });
});

test.after(async () => {
  await prisma.$disconnect();
});
