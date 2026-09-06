import React, { useState, useEffect } from "react";
import { Award, Leaf, ShieldAlert, Calculator, RefreshCw, ArrowRightLeft, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { apiRequest } from "../api.js";

export function OptimizationHubView() {
  const [activeSubTab, setActiveSubTab] = useState("priority");

  // Priority Score State
  const [priorityInputs, setPriorityInputs] = useState({
    userRole: "phd_researcher",
    projectUrgency: "paper_deadline",
    noShowRate: 0.05,
    recentUsageHours: 12
  });
  const [priorityResult, setPriorityResult] = useState(null);
  const [loadingPriority, setLoadingPriority] = useState(false);

  // Bump Proposals State
  const [bumpResult, setBumpResult] = useState(null);
  const [loadingBump, setLoadingBump] = useState(false);

  // Job Estimator State
  const [estimatorInputs, setEstimatorInputs] = useState({
    modelType: "LLM_FINETUNE",
    durationHours: 6,
    gpuCount: 4
  });
  const [estimatorResult, setEstimatorResult] = useState(null);
  const [loadingEstimator, setLoadingEstimator] = useState(false);

  // Predictive Maintenance State
  const [maintenanceReports, setMaintenanceReports] = useState([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthLoaded, setHealthLoaded] = useState(false);

  useEffect(() => {
    calculatePriority();
    calculateEstimate();
    fetchPredictiveMaintenance();
  }, []);

  async function calculatePriority() {
    setLoadingPriority(true);
    try {
      const data = await apiRequest("/optimization/priority-score", {
        method: "POST",
        body: JSON.stringify(priorityInputs)
      });
      if (data.ok) setPriorityResult(data.data);
    } catch (_err) {}
    finally {
      setLoadingPriority(false);
    }
  }

  async function fetchBumpProposals() {
    setLoadingBump(true);
    try {
      const data = await apiRequest("/optimization/bump-proposals", {
        method: "POST",
        body: JSON.stringify({
          userRole: priorityInputs.userRole,
          projectUrgency: priorityInputs.projectUrgency,
          reputationScore: Math.round((1 - priorityInputs.noShowRate) * 100)
        })
      });
      if (data.ok) setBumpResult(data.data);
    } catch (_err) {}
    finally {
      setLoadingBump(false);
    }
  }

  async function calculateEstimate() {
    setLoadingEstimator(true);
    try {
      const data = await apiRequest("/optimization/estimate-job", {
        method: "POST",
        body: JSON.stringify(estimatorInputs)
      });
      if (data.ok) setEstimatorResult(data.data);
    } catch (_err) {}
    finally {
      setLoadingEstimator(false);
    }
  }

  async function fetchPredictiveMaintenance() {
    setLoadingHealth(true);
    setHealthLoaded(false);
    try {
      const data = await apiRequest("/optimization/predictive-maintenance");
      if (data.ok) setMaintenanceReports(data.data);
    } catch (_err) {}
    finally {
      setLoadingHealth(false);
      setHealthLoaded(true);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)" }}>
              ALGORITHM & OPTIMIZATION HUB
            </span>
          </div>
          <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
            Trung Tâm Thuật Toán & Tối Ưu Hóa (2026 Edition)
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Phân hệ xử lý logic nâng cao phục vụ tính điểm ưu tiên đa tầng, ước tính lượng phát thải Carbon (Green AI), và dự đoán hỏng hóc thiết bị.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, overflowX: "auto" }}>
        <button
          className={`btn ${activeSubTab === "priority" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("priority")}
          style={{
            background: activeSubTab === "priority" ? "var(--amber)" : "var(--surface)",
            color: activeSubTab === "priority" ? "var(--bg)" : "var(--text-primary)",
            border: `1px solid ${activeSubTab === "priority" ? "var(--amber)" : "var(--line)"}`,
            fontWeight: 600
          }}
        >
          <Award size={16} /> Thuật Toán Ưu Tiên & Preemption
        </button>
        <button
          className={`btn ${activeSubTab === "green" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("green")}
          style={{
            background: activeSubTab === "green" ? "var(--green)" : "var(--surface)",
            color: activeSubTab === "green" ? "var(--bg)" : "var(--text-primary)",
            border: `1px solid ${activeSubTab === "green" ? "var(--green)" : "var(--line)"}`,
            fontWeight: 600
          }}
        >
          <Leaf size={16} /> Green AI Estimator
        </button>
        <button
          className={`btn ${activeSubTab === "maintenance" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("maintenance")}
          style={{
            background: activeSubTab === "maintenance" ? "var(--purple)" : "var(--surface)",
            color: activeSubTab === "maintenance" ? "var(--bg)" : "var(--text-primary)",
            border: `1px solid ${activeSubTab === "maintenance" ? "var(--purple)" : "var(--line)"}`,
            fontWeight: 600
          }}
        >
          <ShieldAlert size={16} /> Predictive Maintenance
        </button>
      </div>

      {/* PRIORITY TAB */}
      {activeSubTab === "priority" && (
        <div className="content-stack" style={{ gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
                Tham Số Đầu Vào Yêu Cầu
              </h3>
              <div style={{ display: "grid", gap: 14 }}>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Vai trò người dùng</div>
                  <select
                    value={priorityInputs.userRole}
                    onChange={(e) => setPriorityInputs({ ...priorityInputs, userRole: e.target.value })}
                    style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                  >
                    <option value="phd_researcher">Tiến sĩ / Nghiên cứu viên (PhD)</option>
                    <option value="master_student">Học viên Cao học (Master)</option>
                    <option value="undergrad_student">Sinh viên Đại học (Undergrad)</option>
                  </select>
                </label>

                <label>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Độ khẩn cấp dự án</div>
                  <select
                    value={priorityInputs.projectUrgency}
                    onChange={(e) => setPriorityInputs({ ...priorityInputs, projectUrgency: e.target.value })}
                    style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                  >
                    <option value="paper_deadline">Sắp đến hạn nộp bài/paper quốc tế (High)</option>
                    <option value="thesis_defense">Bảo vệ luận văn/đồ án tốt nghiệp (High)</option>
                    <option value="course_project">Bài tập lớn học phần (Medium)</option>
                    <option value="personal_learning">Nghiên cứu / Học tập tự do (Low)</option>
                  </select>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Tỷ lệ vắng mặt (No-show: 0-1)</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={priorityInputs.noShowRate}
                      onChange={(e) => setPriorityInputs({ ...priorityInputs, noShowRate: parseFloat(e.target.value) || 0 })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Giờ đã dùng trong tháng</div>
                    <input
                      type="number"
                      value={priorityInputs.recentUsageHours}
                      onChange={(e) => setPriorityInputs({ ...priorityInputs, recentUsageHours: parseFloat(e.target.value) || 0 })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={calculatePriority} disabled={loadingPriority} style={{ flex: 1, background: "var(--amber)", color: "var(--bg)", fontWeight: 700 }}>
                    {loadingPriority ? "Đang tính..." : "Tính Điểm Priority"}
                  </button>
                  <button className="btn btn-ghost" onClick={fetchBumpProposals} disabled={loadingBump} style={{ border: "1px solid var(--line)", fontSize: "0.8rem" }}>
                    {loadingBump ? "Đang tìm..." : "Tìm Ca Preemption"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
                Kết Quả Multi-Factor Evaluation
              </h3>
              {priorityResult ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--amber)" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block" }}>Tổng Điểm Ưu Tiên P_total</span>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                        Tier: {priorityResult.tier || "STANDARD_PRIORITY"}
                      </span>
                    </div>
                    <span style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                      {priorityResult.totalScore ?? priorityResult.finalPriorityScore}
                    </span>
                  </div>

                  <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Thành Phần Điểm Chi Tiết</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <span>Điểm vai trò (Role Score)</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                          +{priorityResult.breakdown?.roleScore ?? priorityResult.factors?.roleWeight ?? 0}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <span>Điểm mức độ khẩn cấp (Urgency Score)</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                          +{priorityResult.breakdown?.urgencyScore ?? priorityResult.factors?.urgencyWeight ?? 0}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <span>Điểm hạn ngạch còn lại (Quota Balance)</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)" }}>
                          +{priorityResult.breakdown?.quotaBalanceScore ?? priorityResult.factors?.quotaBalanceScore ?? 0}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <span>Hệ số kỷ luật hành vi (Reputation Multiplier)</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: priorityResult.reputationMultiplier < 1 ? "var(--red)" : "var(--green)" }}>
                          x {priorityResult.reputationMultiplier} (Điểm R={priorityResult.reputationScore ?? 100})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "color-mix(in srgb, var(--amber) 8%, transparent)", padding: 12, borderRadius: 6, fontSize: "0.8rem", color: "var(--text-primary)", border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)" }}>
                    <strong>Quy tắc giải quyết tranh chấp:</strong> Khi 2 yêu cầu trùng slot, hệ thống so sánh P_total. Nếu chênh lệch &ge; 25 điểm, yêu cầu có điểm cao hơn được quyền Bump ca và hệ thống tự động bồi thường 4h Quota cho người bị chuyển.
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nhập tham số và bấm tính điểm.</div>
              )}
            </div>
          </div>

          {/* BUMP PROPOSALS SECTION */}
          {bumpResult && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  Ứng Viên Có Thể Bump Ca Preemption (Điểm mục tiêu: {bumpResult.targetPriorityScore})
                </h4>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                  {bumpResult.proposalsFound} ca đủ điều kiện hoán đổi
                </span>
              </div>
              {bumpResult.candidates?.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Không có ca đặt trước nào có độ chênh lệch điểm &ge; 25 trong hệ thống để thực hiện bump.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {bumpResult.candidates.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 6, fontSize: "0.82rem" }}>
                      <div>
                        <strong style={{ color: "var(--text-primary)", display: "block" }}>{c.title}</strong>
                        <span style={{ color: "var(--text-secondary)" }}>Người đặt: {c.requestedBy || "N/A"} | Điểm hiện tại: {c.currentScore}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontWeight: 700, display: "block" }}>
                          +Δ {c.scoreDelta} điểm
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--amber)" }}>
                          Bồi thường +{c.compensationQuotaHours}h quota
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* METHODOLOGY NOTE */}
          <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--surface) 60%, transparent)", border: "1px dashed var(--line)", borderRadius: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <strong>Phương pháp luận tính điểm:</strong> BasePriority = 0.45 &times; S_role + 0.35 &times; S_urgency + 0.20 &times; S_quota. Điểm cuối = BasePriority &times; [(1 - 0.12) + 0.12 &times; (Reputation / 100)]. Dữ liệu tài khoản lấy từ DB.
          </div>
        </div>
      )}

      {/* GREEN AI TAB */}
      {activeSubTab === "green" && (
        <div className="content-stack" style={{ gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
                Dự Tính Huấn Luyện AI (Green AI Profiler)
              </h3>
              <div style={{ display: "grid", gap: 14 }}>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Kiểu Mô Hình</div>
                  <select
                    value={estimatorInputs.modelType}
                    onChange={(e) => setEstimatorInputs({ ...estimatorInputs, modelType: e.target.value })}
                    style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                  >
                    <option value="LLM_FINETUNE">Fine-tune LLM (Llama, Mistral - 400W/GPU)</option>
                    <option value="VISION_TRAINING">Train Thị giác máy tính (ResNet, YOLO - 300W/GPU)</option>
                    <option value="INFERENCE_BENCHMARK">Inference / Benchmark khối lượng lớn (180W/GPU)</option>
                    <option value="EMBEDDED_COMPUTE">Edge AI / Vi điều khiển nhúng (45W/node)</option>
                  </select>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Thời gian chạy (Giờ)</div>
                    <input
                      type="number"
                      value={estimatorInputs.durationHours}
                      onChange={(e) => setEstimatorInputs({ ...estimatorInputs, durationHours: parseFloat(e.target.value) || 0 })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Số lượng GPU</div>
                    <input
                      type="number"
                      value={estimatorInputs.gpuCount}
                      onChange={(e) => setEstimatorInputs({ ...estimatorInputs, gpuCount: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                    />
                  </label>
                </div>

                <button className="btn btn-primary" onClick={calculateEstimate} disabled={loadingEstimator} style={{ background: "var(--green)", color: "var(--bg)", fontWeight: 700, marginTop: 8 }}>
                  {loadingEstimator ? "Đang ước tính..." : "Ước Tính Phát Thải & Điện Năng"}
                </button>
              </div>
            </div>

            <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
                Báo Cáo Năng Lượng & Carbon
              </h3>
              {estimatorResult ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>DỰ KIẾN TIÊU THỤ</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                        {(estimatorResult.energyKwh ?? estimatorResult.totalKwh ?? 0).toFixed(1)} <span style={{ fontSize: "0.9rem" }}>kWh</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                        Ước tính: {(estimatorResult.estimatedCostVnd ?? 0).toLocaleString()} đ (EVN)
                      </div>
                    </div>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>PHÁT THẢI CO2</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                        {(estimatorResult.carbonFootprintKg ?? estimatorResult.carbonEmissionsKg ?? 0).toFixed(1)} <span style={{ fontSize: "0.9rem" }}>kgCO2</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                        Hệ số VN: 0.72 kg CO2/kWh
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", padding: 16, borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>
                      <Calculator size={18} /> Gợi Ý Lịch Trình Carbon-Aware
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {estimatorResult.greenRecommendation?.offPeakSuggestion || "Nên lên lịch ca chạy vào khung giờ đêm (22:00 - 06:00) để tối ưu hóa năng lượng tái tạo."}
                      <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Tiết kiệm tiềm năng: <strong style={{ color: "var(--green)" }}>{(estimatorResult.greenRecommendation?.potentialCarbonSavingsKg ?? 0).toFixed(1)} kgCO2</strong> và giảm khoảng <strong>{(estimatorResult.costSavingsVnd ?? 0).toLocaleString()} đ</strong> chi phí tiền điện.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nhập thông số huấn luyện để phân tích.</div>
              )}
            </div>
          </div>

          {/* METHODOLOGY NOTE */}
          <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--surface) 60%, transparent)", border: "1px dashed var(--line)", borderRadius: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <strong>Công thức ước tính Green AI:</strong> Năng lượng E = (P_watt &times; N_gpu &times; Hours) / 1000. Tiền điện = E &times; 2.500 đ/kWh (khung thường EVN). Phát thải Carbon = E &times; 0.72 kgCO2/kWh. Giờ đêm giảm 30% phát thải.
          </div>
        </div>
      )}

      {/* MAINTENANCE TAB */}
      {activeSubTab === "maintenance" && (
        <div className="content-stack" style={{ gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                  Phân Tích Sức Khỏe Thiết Bị Dự Đoán (Predictive Health)
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Tổng hợp từ 10 mẫu telemetry gần nhất của từng thiết bị trong CSDL
                </span>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={fetchPredictiveMaintenance} disabled={loadingHealth}>
                <RefreshCw size={14} className={loadingHealth ? "spin" : ""} style={{ marginRight: 6 }} /> Làm mới
              </button>
            </div>

            {loadingHealth && !healthLoaded ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 20 }}>Đang phân tích telemetry từ CSDL...</div>
            ) : maintenanceReports.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Không có dữ liệu thiết bị trong CSDL.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line-strong)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>THIẾT BỊ</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>RỦI RO</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>HEALTH & METRICS</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>KHUYẾN NGHỊ BẢO TRÌ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceReports.map((r, i) => {
                      const health = r.predictiveHealth || {};
                      const isCritical = health.riskLevel === "CRITICAL" || health.thermalStressLevel === "HIGH";
                      const isWarning = health.riskLevel === "WARNING" || health.thermalStressLevel === "MODERATE";
                      const tone = isCritical ? "var(--red)" : isWarning ? "var(--amber)" : "var(--green)";

                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>
                            <strong style={{ display: "block" }}>{r.code}</strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{r.name}</span>
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", padding: "3px 8px", borderRadius: 4, background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone, border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)` }}>
                              {health.riskLevel || (health.healthIndex < 50 ? "CRITICAL" : health.healthIndex < 75 ? "WARNING" : "OPTIMAL")}
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", marginBottom: 2 }}>
                              Health Index: <strong>{health.healthIndex ?? 100}</strong>/100 | RUL: ~{health.estimatedRulDays ?? 180} ngày
                            </div>
                            {health.metrics && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                TB: {health.metrics.avgTemp}°C (&plusmn;{health.metrics.tempStdDev}°C) | {health.metrics.avgPowerWatts}W
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 10px", color: "var(--text-primary)", maxWidth: 320 }}>
                            <div style={{ fontSize: "0.8rem" }}>
                              {health.recommendation || "Hệ thống hoạt động ổn định tiêu chuẩn."}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* METHODOLOGY NOTE */}
          <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--surface) 60%, transparent)", border: "1px dashed var(--line)", borderRadius: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <strong>Phương pháp luận dự đoán hỏng hóc:</strong> Phân tích chuỗi thời gian telemetry thực (nhiệt độ GPU/CPU, quạt, công suất điện). Xác định độ lệch chuẩn &ge; 8&deg;C hoặc nhiệt độ TB &gt; 80&deg;C là stress nhiệt, từ đó suy diễn Health Index (0-100) và Remaining Useful Life (RUL).
          </div>
        </div>
      )}
    </div>
  );
}
