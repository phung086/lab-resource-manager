import { prisma } from "../db.js";
import { HttpError } from "./errors.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";

export async function assertLabStaffResourceAccess(userId, resourceId) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, laboratoryId: true }
  });

  if (!resource) {
    throw new HttpError(404, "Resource not found", undefined, "NOT_FOUND");
  }

  if (!resource.laboratoryId) {
    throw new HttpError(403, "LAB_STAFF cannot manage resources without a laboratory assignment", undefined, "FORBIDDEN");
  }

  const assignment = await prisma.userLabAssignment.findUnique({
    where: {
      userId_laboratoryId: {
        userId,
        laboratoryId: resource.laboratoryId
      }
    }
  });

  if (!assignment) {
    throw new HttpError(403, "Access denied: you are not assigned to this resource's laboratory", undefined, "FORBIDDEN");
  }

  return resource;
}

export async function assertLabStaffLaboratoryAccess(userId, laboratoryId) {
  const laboratory = await prisma.laboratory.findUnique({
    where: { id: laboratoryId },
    select: { id: true, isActive: true }
  });
  if (!laboratory) {
    throw new HttpError(404, "Laboratory not found", undefined, "NOT_FOUND");
  }

  const assignment = await prisma.userLabAssignment.findUnique({
    where: { userId_laboratoryId: { userId, laboratoryId } }
  });
  if (!assignment) {
    throw new HttpError(403, "Access denied: you are not assigned to this laboratory", undefined, "FORBIDDEN");
  }
  return laboratory;
}

/**
 * Middleware to enforce lab-scoped access for LAB_STAFF:
 * - ADMIN: has access to all resources and labs across campus.
 * - LAB_STAFF: must be explicitly assigned to the resource's laboratory via UserLabAssignment.
 * - Other roles: pass through if this middleware is guarding staff actions (or rejected if not staff).
 *
 * @param {string} resourceIdSource - 'params.id' | 'params.resourceId' | 'body.resourceId'
 */
export function requireLabAccess(resourceIdSource = "params.id") {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Authentication required", undefined, "AUTH_REQUIRED");
      }

      // ADMIN has unrestricted access across all labs
      if (req.user.role === ADMIN) {
        return next();
      }

      // If user is not LAB_STAFF or ADMIN, they cannot perform lab staff actions
      if (req.user.role !== LAB_STAFF) {
        throw new HttpError(403, "Access denied: insufficient staff permissions", undefined, "FORBIDDEN");
      }

      // Extract resourceId
      let resourceId;
      if (resourceIdSource.startsWith("params.")) {
        const paramName = resourceIdSource.split(".")[1];
        resourceId = req.params[paramName];
      } else if (resourceIdSource.startsWith("body.")) {
        const propName = resourceIdSource.split(".")[1];
        resourceId = req.body?.[propName];
      } else if (resourceIdSource.startsWith("query.")) {
        const propName = resourceIdSource.split(".")[1];
        resourceId = req.query?.[propName];
      } else {
        resourceId = req.params.id || req.body?.resourceId || req.query?.resourceId;
      }

      if (!resourceId) {
        throw new HttpError(400, "Resource scope is required", undefined, "VALIDATION_ERROR");
      }

      await assertLabStaffResourceAccess(req.user.id, resourceId);

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Enforces object-level booking access.
 * Owners receive a non-enumerating 404 for another user's booking.
 */
export async function assertBookingAccess(user, bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, resourceId: true, requestedById: true }
  });

  if (!booking) {
    throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
  }
  if (user.role === ADMIN) return booking;
  if (user.role === LAB_STAFF) {
    await assertLabStaffResourceAccess(user.id, booking.resourceId);
    return booking;
  }
  if (booking.requestedById !== user.id) {
    throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
  }
  return booking;
}

export function requireBookingLabAccess() {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Authentication required", undefined, "AUTH_REQUIRED");
      }
      if (req.user.role === ADMIN) return next();
      if (req.user.role !== LAB_STAFF) {
        throw new HttpError(403, "Access denied: insufficient staff permissions", undefined, "FORBIDDEN");
      }

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
        select: { resourceId: true }
      });
      if (!booking) {
        throw new HttpError(404, "Booking not found", undefined, "NOT_FOUND");
      }

      await assertLabStaffResourceAccess(req.user.id, booking.resourceId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
