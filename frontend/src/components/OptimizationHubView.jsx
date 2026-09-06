import React, { useState, useEffect } from "react";
import { Cpu, Zap, Leaf, ShieldAlert, Award, Calculator, RefreshCw, ArrowRightLeft, AlertTriangle } from "lucide-react";
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

  // Job Estimator State
  const [estimatorInputs, setEstimatorInputs] = useState({
    modelType: "LLM_FINETUNE",
    durationHours: 6,
    gpuCount: 4
  });
  const [estimatorResult, setEstimatorResult] = useState(null);

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
    try {
      const data = await apiRequest("/optimization/priority-score", {
        method: "POST",
        body: JSON.stringify(priorityInputs)
      });
      if (data.ok) setPriorityResult(data.data);
    } catch (_err) {}
  }

  async function calculateEstimate() {
    try {
      const data = await apiRequest("/optimization/estimate-job", {
        method: "POST",
        body: JSON.stringify(estimatorInputs)
      });
      if (data.ok) setEstimatorResult(data.data);
    } catch (_err) {}
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
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--blue)", background: "rgba(59, 130, 246, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
              ALGORITHM & OPTIMIZATION HUB
            </span>
          </div>
          <h2 style={{ margin: "6px 0 2px 0", fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
            Trung Tâm Thuật Toán & Tối Ưu Hóa (2026 Edition)
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Phân hệ xử lý logic nâng cao phục vụ tính điểm ưu tiên, ước tính lượng phát thải Carbon (Green AI), và dự đoán hỏng hóc thiết bị.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, overflowX: "auto" }}>
        <button
          className={`btn ${activeSubTab === "priority" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("priority")}
          style={{ background: activeSubTab === "priority" ? "var(--cyan)" : "var(--surface)", color: activeSubTab === "priority" ? "#14161A" : "var(--text-primary)", border: `1px solid ${activeSubTab === "priority" ? "var(--cyan)" : "var(--line)"}` }}
        >
          <Award size={16} /> Thuật Toán Ưu Tiên
        </button>
        <button
          className={`btn ${activeSubTab === "green" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("green")}
          style={{ background: activeSubTab === "green" ? "var(--green)" : "var(--surface)", color: activeSubTab === "green" ? "#14161A" : "var(--text-primary)", border: `1px solid ${activeSubTab === "green" ? "var(--green)" : "var(--line)"}` }}
        >
          <Leaf size={16} /> Green AI Estimator
        </button>
        <button
          className={`btn ${activeSubTab === "maintenance" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("maintenance")}
          style={{ background: activeSubTab === "maintenance" ? "var(--amber)" : "var(--surface)", color: activeSubTab === "maintenance" ? "#14161A" : "var(--text-primary)", border: `1px solid ${activeSubTab === "maintenance" ? "var(--amber)" : "var(--line)"}` }}
        >
          <ShieldAlert size={16} /> Predictive Maintenance
        </button>
      </div>

      {/* PRIORITY TAB */}
      {activeSubTab === "priority" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
              Tham Số Đầu Vào
            </h3>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Vai trò người dùng</div>
                <select
                  value={priorityInputs.userRole}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, userRole: e.target.value })}
                  style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                >
                  <option value="phd_researcher">Tiến sĩ / Nghiên cứu viên</option>
                  <option value="master_student">Học viên Cao học</option>
                  <option value="undergrad_student">Sinh viên Đại học</option>
                </select>
              </label>

              <label>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Độ khẩn cấp dự án</div>
                <select
                  value={priorityInputs.projectUrgency}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, projectUrgency: e.target.value })}
                  style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                >
                  <option value="paper_deadline">Sắp đến hạn nộp báo cáo/paper (High)</option>
                  <option value="thesis_defense">Bảo vệ đồ án (High)</option>
                  <option value="course_project">Bài tập lớn (Medium)</option>
                  <option value="personal_learning">Học tập tự do (Low)</option>
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Tỷ lệ No-show (0 - 1)</div>
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
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Giờ đã dùng (tuần)</div>
                  <input
                    type="number"
                    value={priorityInputs.recentUsageHours}
                    onChange={(e) => setPriorityInputs({ ...priorityInputs, recentUsageHours: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                  />
                </label>
              </div>

              <button className="btn btn-primary" onClick={calculatePriority} style={{ background: "var(--cyan)", color: "#14161A", fontWeight: 700, marginTop: 8 }}>
                Tính Điểm Priority
              </button>
            </div>
          </div>

          <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
              Kết Quả Multi-Factor Evaluation
            </h3>
            {priorityResult ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--cyan)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Tổng Điểm P_total</span>
                  <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{priorityResult.totalScore.toFixed(2)}</span>
                </div>

                <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Thành Phần Điểm</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <span>Trọng số vai trò ($P_{role}$)</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--blue)" }}>+{priorityResult.factors.roleWeight}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <span>Trọng số khẩn cấp ($P_{urgency}$)</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--blue)" }}>+{priorityResult.factors.urgencyWeight}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <span>Độ trừ No-show ($M_{noshow}$)</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--red)" }}>x {priorityResult.factors.noShowMultiplier.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <span>Độ trừ Quota ($M_{quota}$)</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}>x {priorityResult.factors.usageMultiplier.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: 12, borderRadius: 6, fontSize: "0.8rem", color: "var(--cyan)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                  <strong>Cơ chế phân bổ:</strong> Nếu xảy ra tranh chấp ở cùng khung giờ, request nào có P_total cao hơn sẽ được tự động xếp lịch hoặc có quyền gửi yêu cầu "Swap Ca" tới request đối thủ.
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nhập tham số và tính điểm.</div>
            )}
          </div>
        </div>
      )}

      {/* GREEN AI TAB */}
      {activeSubTab === "green" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
              Dự Tính Huấn Luyện AI
            </h3>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Kiểu Mô Hình</div>
                <select
                  value={estimatorInputs.modelType}
                  onChange={(e) => setEstimatorInputs({ ...estimatorInputs, modelType: e.target.value })}
                  style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: 6, outline: "none" }}
                >
                  <option value="LLM_FINETUNE">Fine-tune LLM (Llama, Mistral)</option>
                  <option value="CNN_TRAIN">Train CNN từ đầu (ResNet, YOLO)</option>
                  <option value="REINFORCEMENT">Học tăng cường (RL / PPO)</option>
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>Thời gian (Giờ)</div>
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

              <button className="btn btn-primary" onClick={calculateEstimate} style={{ background: "var(--green)", color: "#14161A", fontWeight: 700, marginTop: 8 }}>
                Ước Tính Phát Thải
              </button>
            </div>
          </div>

          <div style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 12, fontFamily: "var(--font-heading)" }}>
              Báo Cáo Green AI
            </h3>
            {estimatorResult ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>DỰ KIẾN TIÊU THỤ</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{estimatorResult.totalKwh.toFixed(1)} <span style={{ fontSize: "0.9rem" }}>kWh</span></div>
                  </div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>CARBON EQUIVALENT</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>{estimatorResult.carbonEmissionsKg.toFixed(1)} <span style={{ fontSize: "0.9rem" }}>kgCO2</span></div>
                  </div>
                </div>

                <div style={{ background: "rgba(95, 167, 119, 0.1)", border: "1px solid rgba(95, 167, 119, 0.3)", padding: 16, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>
                    <Calculator size={18} /> Gợi Ý Tối Ưu Lịch (Carbon-Aware Scheduling)
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    Nếu dịch chuyển tác vụ này vào khung giờ <strong>22:00 - 06:00</strong> (Giờ lưới điện thấp điểm, tỷ trọng năng lượng tái tạo cao), bạn có thể giảm phát thải xuống còn <strong style={{ color: "var(--green)" }}>{estimatorResult.optimizedCarbonKg.toFixed(1)} kgCO2</strong>, và tiết kiệm <strong>{estimatorResult.costSavingsVnd.toLocaleString()} đ</strong> chi phí Chargeback.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Nhập thông số huấn luyện để phân tích.</div>
            )}
          </div>
        </div>
      )}

      {/* MAINTENANCE TAB */}
      {activeSubTab === "maintenance" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
            <h3 style={{ fontSize: "1.05rem", color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
              Phân Tích Sức Khỏe Thiết Bị Dự Đoán (Predictive Health)
            </h3>
            <button className="btn btn-sm btn-ghost" onClick={fetchPredictiveMaintenance}>
              <RefreshCw size={14} className={loadingHealth ? "spin" : ""} style={{ marginRight: 6 }} /> Làm mới
            </button>
          </div>

          {loadingHealth && !healthLoaded ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 20 }}>Đang phân tích telemetry...</div>
          ) : maintenanceReports.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Không có dữ liệu thiết bị.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-strong)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>THIẾT BỊ</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>RỦI RO</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>NGUYÊN NHÂN / GỢI Ý</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceReports.map((r, i) => {
                    const health = r.predictiveHealth;
                    const isHighRisk = health.riskLevel === "CRITICAL" || health.riskLevel === "HIGH";
                    const isMediumRisk = health.riskLevel === "WARNING";
                    const tone = isHighRisk ? "var(--red)" : isMediumRisk ? "var(--amber)" : "var(--green)";
                    
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>
                          <strong style={{ display: "block" }}>{r.code}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{r.name}</span>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", padding: "4px 8px", borderRadius: 4, background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone, border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)` }}>
                            {health.riskLevel}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>
                          <div style={{ marginBottom: 4 }}>{health.analysis}</div>
                          {health.recommendation && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}><ArrowRightLeft size={10} style={{ display: "inline" }}/> {health.recommendation}</div>}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          {isHighRisk && (
                            <button className="btn btn-sm" style={{ background: "rgba(193, 80, 63, 0.1)", color: "var(--red)", border: "1px solid var(--red)", fontSize: "0.75rem" }}>
                              Block & Inspect
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
