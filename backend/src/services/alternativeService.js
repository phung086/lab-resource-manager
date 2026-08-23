/**
 * AlternativeService — tìm slot và thiết bị thay thế khi booking bị conflict.
 *
 * Blueprint §9: Alternative Slot / Conflict Resolution
 * Scoring theo §9.1.
 */

import { activeBookingStatuses } from "../utils/bookingOverlap.js";
import { buildAvailableSlotsForResource, BLOCKING_RESOURCE_STATUSES } from "./availabilityService.js";

const DEFAULT_SEARCH_DAYS = 7;
const MAX_ALTERNATIVES = 5;

/**
 * Tìm alternative slots cho cùng resource (thời gian khác).
 *
 * @param {object} client
 * @param {{ resourceId, startAt, endAt, durationMinutes, options }} params
 * @returns {Array<{ resourceId, startAt, endAt, score }>}
 */
export async function findAlternativeSlots(client, { resourceId, startAt, endAt, durationMinutes, options = {} }) {
  const resource = await client.resource.findUnique({ where: { id: resourceId } });
  if (!resource || BLOCKING_RESOURCE_STATUSES.includes(resource.operationalStatus ?? resource.status)) return [];

  const from = new Date(startAt);
  const to = new Date(from);
  to.setDate(to.getDate() + DEFAULT_SEARCH_DAYS);

  // Lấy tất cả blocking intervals trong window tìm kiếm
  const [bookings, maintenanceWindows] = await Promise.all([
    client.booking.findMany({
      where: {
        resourceId,
        status: { in: activeBookingStatuses() },
        startAt: { lt: to },
        endAt: { gt: from }
      }
    }),
    client.maintenanceWindow.findMany({
      where: {
        resourceId,
        status: { in: ["scheduled", "in_progress"] },
        startAt: { lt: to },
        endAt: { gt: from }
      }
    })
  ]);

  const blockingIntervals = [
    ...bookings.map((b) => ({ startAt: new Date(b.startAt), endAt: new Date(b.endAt) })),
    ...maintenanceWindows.map((m) => ({ startAt: new Date(m.startAt), endAt: new Date(m.endAt) }))
  ];

  const slots = buildAvailableSlotsForResource(resource, blockingIntervals, from, to, durationMinutes, options);

  // Score: ưu tiên slot gần requestedTime nhất
  const requestedStart = new Date(startAt).getTime();
  return slots
    .map((slot) => ({
      ...slot,
      score: scoreSlotByTimeDistance(slot, requestedStart, durationMinutes)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ALTERNATIVES);
}

/**
 * Tìm alternative equipment tương đương (cùng type hoặc category).
 *
 * @param {object} client
 * @param {{ resourceId, startAt, endAt, durationMinutes }} params
 * @returns {Array<{ resource, alternativeSlots }>}
 */
export async function findAlternativeEquipment(client, { resourceId, startAt, endAt, durationMinutes }) {
  const original = await client.resource.findUnique({ where: { id: resourceId } });
  if (!original) return [];

  // Tìm thiết bị cùng type, khác id, đang bookable
  const candidates = await client.resource.findMany({
    where: {
      id: { not: resourceId },
      type: original.type,
      bookingState: "bookable",
      operationalStatus: { notIn: ["broken", "retired", "offline", "maintenance", "calibration"] }
    },
    take: 10
  });

  const results = [];
  for (const candidate of candidates) {
    const slots = await findAlternativeSlots(client, {
      resourceId: candidate.id,
      startAt,
      endAt,
      durationMinutes
    });
    if (slots.length > 0) {
      // Kiểm tra slot đúng thời gian requested có available không
      const exactSlot = slots.find((s) => new Date(s.startAt).getTime() === new Date(startAt).getTime());
      results.push({
        resourceId: candidate.id,
        resourceCode: candidate.code,
        resourceName: candidate.name,
        resourceType: candidate.type,
        location: candidate.location,
        equipmentMatchScore: computeEquipmentMatchScore(original, candidate),
        hasExactTimeSlot: !!exactSlot,
        bestSlot: exactSlot || slots[0]
      });
    }
  }

  return results
    .sort((a, b) => b.equipmentMatchScore - a.equipmentMatchScore)
    .slice(0, MAX_ALTERNATIVES);
}

/**
 * Score tổng hợp theo blueprint §9.1
 */
function scoreSlotByTimeDistance(slot, requestedStartMs, durationMinutes) {
  const slotStartMs = new Date(slot.startAt).getTime();
  const distanceMs = Math.abs(slotStartMs - requestedStartMs);
  const distanceDays = distanceMs / 86_400_000;

  // timeDistanceScore: gần thì điểm cao (tối đa 1.0)
  const timeDistanceScore = Math.max(0, 1 - distanceDays / DEFAULT_SEARCH_DAYS);

  // availability score: 1.0 (slot đã được filter sẵn)
  const availabilityScore = 1.0;

  return timeDistanceScore * 0.5 + availabilityScore * 0.5;
}

function computeEquipmentMatchScore(original, candidate) {
  // Same type → cao điểm base
  let score = original.type === candidate.type ? 0.8 : 0.3;

  // Same location → bonus
  if (original.location === candidate.location) score += 0.1;

  // Same laboratory → bonus
  if (original.laboratoryId && original.laboratoryId === candidate.laboratoryId) score += 0.1;

  return Math.min(1.0, score);
}
