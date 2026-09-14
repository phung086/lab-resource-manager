import assert from "node:assert/strict";

const BASE_URL = "http://localhost:8000";

async function verify() {
  console.log("🔍 Verifying Live API Endpoints on " + BASE_URL + "...");

  // 1. Health
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log("✅ GET /health:", health.service);
  assert.equal(health.ok, true);

  // 2. Resources (dual mounted)
  const res1 = await fetch(`${BASE_URL}/api/resources`);
  const resources = await res1.json();
  console.log(`✅ GET /api/resources: Returned ${resources.length} items`);
  assert.ok(Array.isArray(resources));

  // 3. Calendar Slots
  const calRes = await fetch(`${BASE_URL}/api/calendar/slots`);
  const calendar = await calRes.json();
  console.log(`✅ GET /api/calendar/slots: Grid has ${calendar.grid?.length} rows`);
  assert.equal(calendar.grid?.length, 13);
  assert.equal(calendar.daysHeader?.length, 7);

  // 4. AI Efficiency KPI
  const kpiRes = await fetch(`${BASE_URL}/api/ai/efficiency-kpi`);
  const kpi = await kpiRes.json();
  console.log("✅ GET /api/ai/efficiency-kpi: Utilization =", kpi.kpis?.utilizationRate?.value);
  assert.equal(kpi.kpis?.utilizationRate?.value, 84.5);

  // 5. AI Density Heatmap
  const heatRes = await fetch(`${BASE_URL}/api/ai/density-heatmap`);
  const heatmap = await heatRes.json();
  console.log(`✅ GET /api/ai/density-heatmap: Matrix has ${heatmap.matrix?.length} days`);
  assert.equal(heatmap.matrix?.length, 7);

  // 6. AI Advisory Cards
  const advRes = await fetch(`${BASE_URL}/api/ai/advisory-cards`);
  const cards = await advRes.json();
  console.log(`✅ GET /api/ai/advisory-cards: Returned ${cards.length} cards`);
  assert.equal(cards.length, 4);

  // 7. AI Copilot Chat
  const chatRes = await fetch(`${BASE_URL}/api/ai/copilot-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Tìm cho tôi khung giờ trống của GPU H100 ngày mai" })
  });
  const chat = await chatRes.json();
  console.log("✅ POST /api/ai/copilot-chat: Reply length =", chat.reply?.length);
  assert.ok(chat.reply?.includes("H100"));

  // 8. Admin Transactions
  const txnRes = await fetch(`${BASE_URL}/api/admin/transactions`);
  const txn = await txnRes.json();
  console.log("✅ GET /api/admin/transactions: Revenue =", txn.summary?.formattedTotalRevenue);
  assert.ok(txn.summary);

  console.log("\n🎉 ALL 8 LIVE API ENDPOINTS VERIFIED SUCCESSFULLY!");
}

verify().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
