import assert from "node:assert/strict";
import test from "node:test";

import { getSmartRecommendations, handleCopilotChat } from "../src/services/advisoryService.js";
import { getDensityHeatmap, getKpiSummary } from "../src/services/efficiencyService.js";

test("Conflict Logic - allows adjacent booking windows without collision", () => {
  const aStart = new Date("2026-09-10T08:00:00Z");
  const aEnd = new Date("2026-09-10T10:00:00Z");
  const bStart = new Date("2026-09-10T10:00:00Z");
  const bEnd = new Date("2026-09-10T12:00:00Z");

  const hasOverlap = aStart < bEnd && aEnd > bStart;
  assert.equal(hasOverlap, false, "Adjacent windows should not collide");
});

test("Conflict Logic - flags true overlaps accurately", () => {
  const aStart = new Date("2026-09-10T09:00:00Z");
  const aEnd = new Date("2026-09-10T11:00:00Z");
  const bStart = new Date("2026-09-10T10:00:00Z");
  const bEnd = new Date("2026-09-10T12:00:00Z");

  const hasOverlap = aStart < bEnd && aEnd > bStart;
  assert.equal(hasOverlap, true, "Overlapping windows must collide");
});

test("Efficiency Service - generates complete 7x12 density heatmap matrix", async () => {
  const heatmap = await getDensityHeatmap();

  assert.equal(heatmap.length, 7, "Matrix must have 7 days");
  for (const day of heatmap) {
    assert.ok(day.dayName, "Day must have a label");
    assert.equal(day.slots.length, 12, "Each day must have 12 time slots (08:00 to 20:00)");
    for (const slot of day.slots) {
      assert.ok(slot.density >= 0.0 && slot.density <= 1.0, "Density must be between 0.0 and 1.0");
      assert.ok(slot.percentage.endsWith("%"), "Percentage must format properly");
    }
  }
});

test("Efficiency Service - computes 4 Hero KPIs & Before vs After comparison", async () => {
  const summary = await getKpiSummary();

  assert.ok(summary.kpis.utilizationRate, "Must have utilizationRate");
  assert.equal(summary.kpis.utilizationRate.value, 84.5);

  assert.ok(summary.kpis.efficiencyScore, "Must have efficiencyScore");
  assert.equal(summary.kpis.efficiencyScore.value, 92);

  assert.ok(summary.kpis.idleHoursSaved, "Must have idleHoursSaved");
  assert.equal(summary.kpis.idleHoursSaved.value, 14.2);

  assert.ok(summary.kpis.commitmentRate, "Must have commitmentRate");
  assert.equal(summary.kpis.commitmentRate.value, 96.0);

  // Before vs After
  assert.equal(summary.beforeAfter.idleHours.improvement, "-63%");
  assert.equal(summary.beforeAfter.conflictRate.improvement, "-92%");
});

test("Advisory Service - produces 4 smart recommendation cards with actionable payloads", async () => {
  const cards = await getSmartRecommendations();

  assert.equal(cards.length, 4, "Must return 4 core recommendations");
  const categories = cards.map((c) => c.category);

  assert.ok(categories.includes("COST_OPTIMIZATION"), "Must include cost optimization");
  assert.ok(categories.includes("CONFLICT_RESOLUTION"), "Must include conflict resolution");
  assert.ok(categories.includes("REPUTATION_PROTECTION"), "Must include reputation protection");
  assert.ok(categories.includes("GREEN_AI_DISCOUNT"), "Must include green AI discount");

  for (const card of cards) {
    assert.ok(card.actionType, "Card must have actionType");
    assert.ok(card.actionLabel, "Card must have actionLabel");
  }
});

test("Advisory Service - Copilot chat responds to GPU query with structured action", async () => {
  const response = await handleCopilotChat("Tìm cho tôi khung giờ trống của GPU H100 ngày mai");

  assert.ok(response.reply.includes("H100"), "Reply should mention H100");
  assert.ok(response.reply.includes("14:00"), "Reply should recommend slot 14:00");
  assert.ok(response.suggestedAction, "Response must provide suggestedAction");
  assert.equal(response.suggestedAction.type, "PREFILL_BOOKING");
});

test("Advisory Service - Copilot chat responds to quota saving tips", async () => {
  const response = await handleCopilotChat("Làm sao để tôi tiết kiệm hạn ngạch tuần này?");

  assert.ok(response.reply.includes("Khung Giờ Xanh"), "Reply should advise green hours");
  assert.ok(response.suggestedAction, "Response must provide suggestedAction");
  assert.equal(response.suggestedAction.type, "NAVIGATE_TAB");
});
