import { Prisma } from "@prisma/client";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { HttpError } from "../middleware/errors.js";

/** Aggregate persisted evidence in one PostgreSQL snapshot, before any UI limit. */
export async function buildOperationsReport(client, user, { days = 30, now = new Date() } = {}) {
  if (![ADMIN, LAB_STAFF].includes(user.role)) {
    throw new HttpError(403, "Insufficient permission", undefined, "FORBIDDEN");
  }
  if (![7, 30].includes(days) || !Number.isFinite(now.getTime())) {
    throw new HttpError(400, "Invalid report window", undefined, "VALIDATION_ERROR");
  }
  const start = new Date(now.getTime() - days * 24 * 60 * 60_000);
  const scope = user.role === ADMIN ? Prisma.sql`TRUE` : Prisma.sql`EXISTS (
    SELECT 1 FROM user_lab_assignments a
    WHERE a."laboratoryId" = r."laboratoryId" AND a."userId" = ${user.id}
  )`;
  const rows = await client.$queryRaw(Prisma.sql`
    WITH authorized AS (
      SELECT r.id, r.code, r.name, r.category, r."operationalStatus",
             l.name AS "laboratoryName"
      FROM resources r LEFT JOIN laboratories l ON l.id = r."laboratoryId"
      WHERE ${scope}
    ), booking_evidence AS (
      SELECT b."resourceId",
        COUNT(*) FILTER (WHERE b."startAt" < ${now} AND b."endAt" > ${start})::int AS "bookingCount",
        COUNT(*) FILTER (WHERE b."startAt" < ${now} AND b."endAt" > ${start}
          AND b.status = 'CANCELLED')::int AS "cancelledCount",
        COUNT(*) FILTER (WHERE b."startAt" < ${now} AND b."endAt" > ${start}
          AND b.outcome = 'NO_SHOW')::int AS "noShowCount",
        COUNT(*) FILTER (WHERE b."actualEndAt" >= ${start} AND b."actualEndAt" < ${now})::int AS "endedSessionCount",
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (
          LEAST(b."endAt", ${now}) - GREATEST(b."startAt", ${start})
        )) / 60)) FILTER (WHERE b.status IN ('CONFIRMED','CHECKED_OUT','RETURNED','COMPLETED')
          AND b."startAt" < ${now} AND b."endAt" > ${start}), 0)::double precision AS "scheduledMinutes",
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (
          LEAST(COALESCE(b."actualEndAt", ${now}), ${now}) - GREATEST(b."actualStartAt", ${start})
        )) / 60)) FILTER (WHERE b."actualStartAt" < ${now}
          AND COALESCE(b."actualEndAt", ${now}) > ${start}), 0)::double precision AS "actualUsageMinutes"
      FROM bookings b JOIN authorized r ON r.id = b."resourceId"
      WHERE (b."startAt" < ${now} AND b."endAt" > ${start})
         OR (b."actualStartAt" < ${now} AND COALESCE(b."actualEndAt", ${now}) >= ${start})
      GROUP BY b."resourceId"
    ), incident_evidence AS (
      SELECT i."resourceId",
        COUNT(*) FILTER (WHERE i."detectedAt" >= ${start} AND i."detectedAt" < ${now})::int AS "incidentCount",
        COUNT(*) FILTER (WHERE i.status IN ('reported','triaged','assigned','investigating'))::int AS "openIncidentCount"
      FROM incidents i JOIN authorized r ON r.id = i."resourceId"
      GROUP BY i."resourceId"
    ), maintenance_evidence AS (
      SELECT m."resourceId", COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (
        LEAST(m."endAt", ${now}) - GREATEST(m."startAt", ${start})
      )) / 60)), 0)::double precision AS "plannedMaintenanceMinutes"
      FROM maintenance_windows m JOIN authorized r ON r.id = m."resourceId"
      WHERE m.status <> 'cancelled' AND m."startAt" < ${now} AND m."endAt" > ${start}
      GROUP BY m."resourceId"
    )
    SELECT r.*, COALESCE(b."bookingCount",0) AS "bookingCount",
      COALESCE(b."cancelledCount",0) AS "cancelledCount", COALESCE(b."noShowCount",0) AS "noShowCount",
      COALESCE(b."endedSessionCount",0) AS "endedSessionCount",
      COALESCE(b."scheduledMinutes",0) AS "scheduledMinutes",
      COALESCE(b."actualUsageMinutes",0) AS "actualUsageMinutes",
      COALESCE(i."incidentCount",0) AS "incidentCount", COALESCE(i."openIncidentCount",0) AS "openIncidentCount",
      COALESCE(m."plannedMaintenanceMinutes",0) AS "plannedMaintenanceMinutes"
    FROM authorized r
    LEFT JOIN booking_evidence b ON b."resourceId" = r.id
    LEFT JOIN incident_evidence i ON i."resourceId" = r.id
    LEFT JOIN maintenance_evidence m ON m."resourceId" = r.id
    ORDER BY "actualUsageMinutes" DESC, "scheduledMinutes" DESC, r.code, r.id
  `);
  const fields = ["bookingCount", "cancelledCount", "noShowCount", "endedSessionCount", "scheduledMinutes",
    "actualUsageMinutes", "incidentCount", "openIncidentCount", "plannedMaintenanceMinutes"];
  const round = value => Math.round(Number(value) * 100) / 100;
  const totals = Object.fromEntries(fields.map(field => [field, round(rows.reduce((sum, row) => sum + Number(row[field]), 0))]));
  return {
    source: "database",
    generatedAt: now.toISOString(),
    window: { days, startAt: start.toISOString(), endAt: now.toISOString(), timezone: "Asia/Ho_Chi_Minh", interval: "[startAt,endAt)" },
    basis: { usage: "BOOKING_ACTUAL_TIMESTAMPS", scheduled: "APPROVED_BOOKING_INTERVALS", maintenance: "PLANNED_WINDOWS", bookings: "SCHEDULE_OVERLAPS_WINDOW", openIncidents: "CURRENT_STATUS" },
    summary: { resourceCount: rows.length, usedResourceCount: rows.filter(row => row.actualUsageMinutes > 0).length, ...totals },
    resources: rows.map(row => ({ ...row, ...Object.fromEntries(fields.map(field => [field, round(row[field])])) }))
  };
}
