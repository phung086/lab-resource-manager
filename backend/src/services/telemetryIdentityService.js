import crypto from "node:crypto";

import { HttpError } from "../middleware/errors.js";

const TOKEN_PREFIX = "lrmts";
const SOURCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function digestCredential(salt, secret) {
  return crypto.createHash("sha256").update(`${salt}:${secret}`, "utf8").digest("hex");
}

function timingSafeHexEqual(left, right) {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function issueCredential(sourceId) {
  const secret = crypto.randomBytes(32).toString("base64url");
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    token: `${TOKEN_PREFIX}_${sourceId}_${secret}`,
    credentialSalt: salt,
    credentialHash: digestCredential(salt, secret)
  };
}

function parseCredential(token) {
  const value = String(token || "");
  const match = /^lrmts_([^_]+)_([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match || !SOURCE_ID_PATTERN.test(match[1])) return null;
  return { sourceId: match[1], secret: match[2] };
}

export function telemetrySourceInclude() {
  return {
    resource: {
      include: {
        monitoringThreshold: true,
        laboratory: { include: { monitoringThreshold: true } }
      }
    }
  };
}

export async function createTelemetrySource(tx, { code, name, laboratoryId, resourceId }) {
  const resource = await tx.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, laboratoryId: true }
  });
  if (!resource) throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
  if (!resource.laboratoryId || resource.laboratoryId !== laboratoryId) {
    throw new HttpError(400, "Source laboratory must match its resource laboratory", { field: "laboratoryId" }, "TELEMETRY_RESOURCE_SCOPE_MISMATCH");
  }

  const id = crypto.randomUUID();
  const issued = issueCredential(id);
  const source = await tx.telemetrySource.create({
    data: {
      id,
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      laboratoryId,
      resourceId,
      credentialSalt: issued.credentialSalt,
      credentialHash: issued.credentialHash
    }
  });
  return { source, token: issued.token };
}

export async function rotateTelemetrySourceCredential(tx, sourceId) {
  const existing = await tx.telemetrySource.findUnique({ where: { id: sourceId }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Telemetry source not found", undefined, "NOT_FOUND");
  const issued = issueCredential(sourceId);
  const source = await tx.telemetrySource.update({
    where: { id: sourceId },
    data: {
      credentialSalt: issued.credentialSalt,
      credentialHash: issued.credentialHash
    }
  });
  return { source, token: issued.token };
}

export async function authenticateTelemetrySource(client, token) {
  const parsed = parseCredential(token);
  if (!parsed) {
    throw new HttpError(401, "Telemetry source credential is invalid", undefined, "UNAUTHORIZED");
  }
  const source = await client.telemetrySource.findUnique({
    where: { id: parsed.sourceId },
    include: telemetrySourceInclude()
  });
  if (!source || !timingSafeHexEqual(digestCredential(source?.credentialSalt, parsed.secret), source?.credentialHash)) {
    throw new HttpError(401, "Telemetry source credential is invalid", undefined, "UNAUTHORIZED");
  }
  if (!source.isActive) {
    throw new HttpError(403, "Telemetry source is inactive", undefined, "TELEMETRY_SOURCE_INACTIVE");
  }
  return source;
}

export function serializeTelemetrySource(source, now = new Date(), staleMinutes = 15) {
  const lastSampleAt = source.lastSampleAt ? new Date(source.lastSampleAt) : null;
  const fresh = Boolean(lastSampleAt && now.getTime() - lastSampleAt.getTime() <= staleMinutes * 60_000);
  return {
    id: source.id,
    code: source.code,
    name: source.name,
    laboratoryId: source.laboratoryId,
    resourceId: source.resourceId,
    isActive: source.isActive,
    reportedOnline: source.reportedOnline,
    lastSeenAt: source.lastSeenAt,
    lastSampleAt: source.lastSampleAt,
    freshness: lastSampleAt ? (fresh ? "FRESH" : "STALE") : "NO_DATA"
  };
}
