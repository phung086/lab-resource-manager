import crypto from "node:crypto";

import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

export function cameraScopeWhere(user) {
  if (user.role === ADMIN) return {};
  if (user.role === LAB_STAFF) {
    return { laboratory: { staffAssignments: { some: { userId: user.id } } } };
  }
  return { id: { in: [] } };
}

export function serializeCamera(camera) {
  return {
    id: camera.id,
    code: camera.code,
    name: camera.name,
    laboratoryId: camera.laboratoryId,
    resourceId: camera.resourceId,
    telemetrySourceId: camera.telemetrySourceId,
    enabled: camera.enabled,
    state: !camera.enabled ? "NOT_CONFIGURED" : camera.endpointUrl ? camera.status : "NOT_CONFIGURED",
    hasEndpoint: Boolean(camera.endpointUrl),
    updatedAt: camera.updatedAt
  };
}

export async function recordCameraAccessAttempt(tx, { cameraId, actor, purpose }) {
  const camera = await tx.camera.findUnique({ where: { id: cameraId } });
  if (!camera) throw new HttpError(404, "Camera not found", undefined, "NOT_FOUND");

  let allowed = actor.role === ADMIN;
  if (actor.role === LAB_STAFF) {
    const assignment = await tx.userLabAssignment.findUnique({
      where: { userId_laboratoryId: { userId: actor.id, laboratoryId: camera.laboratoryId } },
      select: { userId: true }
    });
    allowed = Boolean(assignment);
  }

  const now = new Date();
  let outcome = "DENIED";
  let detail = "Camera access is restricted to ADMIN or assigned LAB_STAFF";
  if (allowed && (!camera.enabled || !camera.endpointUrl)) {
    outcome = "NOT_CONFIGURED";
    detail = "Camera is disabled or has no configured endpoint";
  } else if (allowed && camera.status !== "AVAILABLE") {
    outcome = "UNAVAILABLE";
    detail = "Configured camera endpoint is not currently available";
  } else if (allowed) {
    outcome = "METADATA_ONLY";
    detail = "Metadata access recorded; this application does not expose or fabricate a video stream";
  }

  const audit = await tx.cameraAccessAudit.create({
    data: {
      id: crypto.randomUUID(),
      cameraId: camera.id,
      resourceId: camera.resourceId,
      laboratoryId: camera.laboratoryId,
      actorId: actor.id,
      purpose,
      startedAt: now,
      endedAt: now,
      outcome,
      detail
    }
  });

  return { camera: serializeCamera(camera), audit, allowed };
}
