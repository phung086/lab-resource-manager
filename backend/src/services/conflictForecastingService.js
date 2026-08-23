/**
 * Historical Booking Trend Analysis & Statistical Conflict Forecasting Service (Phase 4)
 * Analyzes empirical booking frequency across a rolling time window (W = 8 weeks).
 * Computes slot congestion probability P_congestion(t, d, c) using descriptive statistics.
 * 
 * Note: Pure statistical frequency ratio analysis. No ML/AI black-box models used.
 */

export const CONGESTION_WARNING_THRESHOLD = 0.75; // 75% historical capacity utilization threshold

/**
 * Computes statistical congestion probability P_congestion(t, d, c) for a specific time slot
 * Formula: P_congestion(t, d, c) = HistoricalDemandHours(t, d, c) / TotalAvailableCapacityHours(t, d, c)
 */
export function calculateSlotCongestionProbability({
  historicalBookings = [],
  dayOfWeek,           // 1 (Thứ Hai) -> 7 (Chủ Nhật)
  hourSlot,            // 8 -> 20
  resourceCategory = "GPU_SERVER",
  totalCapacityHours = null,
  resourceCount = 2,
  rollingWeeks = 8
}) {
  // 1. Calculate total available capacity across rolling window
  // e.g., 2 GPU servers * 8 weeks * 1 hour/slot = 16 capacity hours
  const capacityHours = totalCapacityHours !== null
    ? totalCapacityHours
    : Math.max(1, resourceCount * rollingWeeks * 1.0);

  // 2. Aggregate actual historical demand hours in this exact slot
  const matchingBookings = historicalBookings.filter((b) => {
    // Filter status
    if (b.status === "cancelled" || b.status === "rejected") return false;

    // Filter day of week
    const bDay = b.dayOfWeek !== undefined ? b.dayOfWeek : (b.startTime ? new Date(b.startTime).getDay() || 7 : 1);
    if (bDay !== dayOfWeek) return false;

    // Filter resource category
    const bCategory = b.resourceCategory || (b.resource?.type) || "GPU_SERVER";
    if (resourceCategory && bCategory !== resourceCategory) return false;

    // Filter hour slot overlap
    const bStart = typeof b.startHour === "number" ? b.startHour : (b.startTime ? new Date(b.startTime).getHours() : 0);
    const bEnd = typeof b.endHour === "number" ? b.endHour : (b.endTime ? new Date(b.endTime).getHours() : bStart + 1);

    return hourSlot >= bStart && hourSlot < bEnd;
  });

  const totalDemandHours = matchingBookings.reduce((sum, b) => {
    const duration = b.durationHours || 1.0;
    return sum + duration;
  }, 0.0);

  // 3. Compute Congestion Probability P in [0.0, 1.0]
  const rawProbability = totalDemandHours / capacityHours;
  const congestionProbability = Math.max(0.0, Math.min(1.0, Math.round(rawProbability * 10000) / 10000));
  const isWarning = congestionProbability >= CONGESTION_WARNING_THRESHOLD;

  return {
    dayOfWeek,
    hourSlot,
    resourceCategory,
    totalDemandHours: Math.round(totalDemandHours * 10) / 10,
    capacityHours,
    rollingWeeks,
    congestionProbability,
    congestionPercent: Math.round(congestionProbability * 1000) / 10,
    isWarning,
    statusLabel: isWarning ? "CẢNH BÁO NGUY CƠ QUÁ TẢI" : "TẢI TIÊU CHUẨN AN TOÀN"
  };
}

/**
 * Generates proactive weekly congestion forecast alerts and shift recommendations
 */
export function generateWeeklyCongestionForecast({
  historicalBookings = [],
  resources = [],
  rollingWeeks = 8,
  warningThreshold = CONGESTION_WARNING_THRESHOLD
}) {
  const forecasts = [];
  const resourceCategories = ["GPU_SERVER", "DRONE_UAV", "EDGE_KIT"];

  const dayNames = {
    1: "Thứ Hai",
    2: "Thứ Ba",
    3: "Thứ Tư",
    4: "Thứ Năm",
    5: "Thứ Sáu",
    6: "Thứ Bảy",
    7: "Chủ Nhật"
  };

  for (const category of resourceCategories) {
    const categoryResources = resources.filter((r) => (r.type || "GPU_SERVER") === category);
    const resourceCount = Math.max(1, categoryResources.length || 2);

    for (let day = 1; day <= 5; day++) { // Focus on lab working days Monday - Friday
      // Scan all daytime slots to identify hot slots and candidate cold shift slots
      const daySlots = [];
      for (let hour = 8; hour <= 18; hour++) {
        const slotStat = calculateSlotCongestionProbability({
          historicalBookings,
          dayOfWeek: day,
          hourSlot: hour,
          resourceCategory: category,
          resourceCount,
          rollingWeeks
        });
        daySlots.push(slotStat);
      }

      // Find lowest-congestion cold slot on the same day for shift recommendation
      const coldSlots = [...daySlots].sort((a, b) => a.congestionProbability - b.congestionProbability);
      const bestColdSlot = coldSlots[0] || { hourSlot: 9, congestionPercent: 20.0 };

      // Identify slots exceeding warning threshold
      for (const slot of daySlots) {
        if (slot.congestionProbability >= warningThreshold) {
          const forecastId = `FC-${category}-${day}-${slot.hourSlot}`;
          const formattedTime = `${slot.hourSlot}:00 - ${slot.hourSlot + 2}:00`;
          const shiftFormattedTime = `${bestColdSlot.hourSlot}:00 - ${bestColdSlot.hourSlot + 2}:00`;

          forecasts.push({
            id: forecastId,
            resourceCategory: category,
            dayOfWeek: day,
            dayName: dayNames[day],
            hourSlot: slot.hourSlot,
            timeSlot: `${formattedTime} (${dayNames[day]})`,
            congestionProbability: slot.congestionProbability,
            congestionPercent: slot.congestionPercent,
            historicalDemandHours: slot.totalDemandHours,
            capacityHours: slot.capacityHours,
            rollingWeeks,
            warningStatus: "PROACTIVE_FORECAST",
            statusLabel: "DỰ BÁO XUNG ĐỘT (TẦN SUẤT LỊCH SỬ)",
            suggestedShiftHour: bestColdSlot.hourSlot,
            suggestedShiftTimeSlot: `${shiftFormattedTime} (${dayNames[day]})`,
            coldSlotCongestionPercent: bestColdSlot.congestionPercent,
            recommendationText: `Khung giờ ${formattedTime} ${dayNames[day]} tuần tới có xác suất quá tải ${slot.congestionPercent}% dựa trên tần suất ${rollingWeeks} tuần gần nhất. Gợi ý dịch chuyển ca sang ${shiftFormattedTime} cùng ngày (mức tải dự kiến chỉ ${bestColdSlot.congestionPercent}%).`
          });
        }
      }
    }
  }

  return {
    totalForecasts: forecasts.length,
    rollingWeeks,
    warningThreshold,
    forecasts
  };
}

/**
 * Proposes a proactive shift recommendation for a specific booking request
 */
export function proposeShiftRecommendation({
  booking,
  historicalBookings = [],
  resources = [],
  rollingWeeks = 8
}) {
  const day = booking.dayOfWeek || (booking.startTime ? new Date(booking.startTime).getDay() || 7 : 3);
  const hour = typeof booking.startHour === "number" ? booking.startHour : (booking.startTime ? new Date(booking.startTime).getHours() : 14);
  const category = booking.resourceCategory || "GPU_SERVER";

  const slotStat = calculateSlotCongestionProbability({
    historicalBookings,
    dayOfWeek: day,
    hourSlot: hour,
    resourceCategory: category,
    rollingWeeks
  });

  if (!slotStat.isWarning) {
    return {
      hasConflictRisk: false,
      congestionPercent: slotStat.congestionPercent,
      reason: "KHUNG_GIO_AN_TOAN_DUOI_NGUONG_CANH_BAO"
    };
  }

  // Find candidate cold slot
  const candidateHours = [9, 10, 11, 13, 15, 16].filter((h) => Math.abs(h - hour) >= 2);
  let bestHour = 10;
  let minCongestion = 1.0;

  for (const h of candidateHours) {
    const cStat = calculateSlotCongestionProbability({
      historicalBookings,
      dayOfWeek: day,
      hourSlot: h,
      resourceCategory: category,
      rollingWeeks
    });
    if (cStat.congestionProbability < minCongestion) {
      minCongestion = cStat.congestionProbability;
      bestHour = h;
    }
  }

  return {
    hasConflictRisk: true,
    congestionProbability: slotStat.congestionProbability,
    congestionPercent: slotStat.congestionPercent,
    currentSlot: `${hour}:00`,
    suggestedShiftSlot: `${bestHour}:00`,
    suggestedShiftCongestionPercent: Math.round(minCongestion * 1000) / 10,
    recommendationText: `Khung giờ ${hour}:00 có xác suất quá tải ${slotStat.congestionPercent}%. Đề xuất dịch chuyển sang ${bestHour}:00 (mức tải chỉ ${Math.round(minCongestion * 100)}%).`
  };
}
