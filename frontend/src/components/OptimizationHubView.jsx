import React, { useState, useEffect } from "react";
import { Cpu, Zap, Leaf, ShieldAlert, Award, Calculator, RefreshCw, ArrowRightLeft, AlertTriangle } from "lucide-react";

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

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  async function calculatePriority() {
    try {
      const res = await fetch(`http://${host}:8000/optimization/priority-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(priorityInputs)
      });
      const data = await res.json();
      if (data.ok) setPriorityResult(data.data);
    } catch (_err) {
      // Fallback local calc
    }
  }

  async function calculateEstimate() {
    try {
      const res = await fetch(`http://${host}:8000/optimization/estimate-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimatorInputs)
      });
      const data = await res.json();
      if (data.ok) setEstimatorResult(data.data);
    } catch (_err) {}
  }

  async function fetchPredictiveMaintenance() {
    setLoadingHealth(true);
    setHealthLoaded(false);
    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/optimization/predictive-maintenance`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.ok) setMaintenanceReports(data.data);
    } catch (_err) {}
    finally {
      setLoadingHealth(false);
      setHealthLoaded(true);
    }
  }

  return (
    <div className="view-root">
      <div className="view-header">
        <div>
          <h2>Trung Tâm Thuật Toán & Tối Ưu Hóa (Algorithm & Optimization Hub 2026)</h2>
          <p className="view-subtitle">Phân hệ xử lý logic nâng cao phục vụ nghiên cứu & vận hành phòng lab thông minh</p>
        </div>
      </div>

      <div className="sub-tab-bar" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          className={`btn ${activeSubTab === "priority" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("priority")}
        >
          <Award size={16} /> Thuật Toán Điểm Ưu Tiên & Swap Ca
        </button>
        <button
          className={`btn ${activeSubTab === "green" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("green")}
        >
          <Leaf size={16} /> Green AI & Carbon Footprint Estimator
        </button>
        <button
          className={`btn ${activeSubTab === "predictive" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveSubTab("predictive")}
        >
          <ShieldAlert size={16} /> Dự Đoán Bảo Trì & Anomaly Detection IoT
        </button>
      </div>

      {/* TAB 1: DYNAMIC PRIORITY SCORE */}
      {activeSubTab === "priority" && (
        <div className="split-layout">
          <div className="card">
            <div className="card-header">
              <Calculator size={18} className="text-primary" />
              <strong>Tính Điểm Ưu Tiên Động (Dynamic Priority Score)</strong>
            </div>
            <div className="form-stack" style={{ gap: 12, marginTop: 12 }}>
              <label>
                <span>Vai trò người dùng:</span>
                <select
                  value={priorityInputs.userRole}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, userRole: e.target.value })}
                >
                  <option value="phd_researcher">Nghiên cứu sinh Tiến sĩ (PhD)</option>
                  <option value="master_student">Học viên Cao học (Master)</option>
                  <option value="undergrad_student">Sinh viên Đại học (Undergrad)</option>
                  <option value="guest">Khách mời / Thực tập sinh</option>
                </select>
              </label>

              <label>
                <span>Độ khẩn cấp nhiệm vụ:</span>
                <select
                  value={priorityInputs.projectUrgency}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, projectUrgency: e.target.value })}
                >
                  <option value="paper_deadline">Nộp bài báo khoa học Q1/Q2 (Gấp)</option>
                  <option value="thesis_defense">Bảo vệ Đồ án Tốt nghiệp</option>
                  <option value="course_project">Bài tập lớn môn học</option>
                  <option value="personal_learning">Tự học & Nghiên cứu cá nhân</option>
                </select>
              </label>

              <label>
                <span>Tỷ lệ No-show lịch sử (%):</span>
                <input
                  type="number"
                  step="0.01"
                  value={priorityInputs.noShowRate}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, noShowRate: parseFloat(e.target.value) })}
                />
              </label>

              <label>
                <span>Số giờ GPU đã dùng trong tuần:</span>
                <input
                  type="number"
                  value={priorityInputs.recentUsageHours}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, recentUsageHours: parseInt(e.target.value) })}
                />
              </label>

              <button className="btn btn-primary" onClick={calculatePriority}>Tính Điểm Thuật Toán</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Award size={18} className="text-success" />
              <strong>Kết Quả Phân Tích Điểm Ưu Tiên</strong>
            </div>

            {priorityResult ? (
              <div className="priority-result-box" style={{ marginTop: 16 }}>
                <div style={{ textAlign: "center", padding: 16, background: "rgba(36, 107, 254, 0.08)", borderRadius: 12 }}>
                  <div style={{ fontSize: 42, fontWeight: 700, color: "var(--blue)" }}>{priorityResult.totalScore} / 100</div>
                  <span className="badge success">{priorityResult.tier}</span>
                </div>

                <div style={{ marginTop: 16, fontSize: 13 }} className="form-stack">
                  <div className="row between"><span>Điểm Vai trò (Role Weight):</span> <strong>+{priorityResult.breakdown.roleScore}</strong></div>
                  <div className="row between"><span>Điểm Mức khẩn cấp (Urgency Weight):</span> <strong>+{priorityResult.breakdown.urgencyScore}</strong></div>
                  <div className="row between"><span>Điểm Độ tin cậy (Reliability):</span> <strong>+{priorityResult.breakdown.reliabilityScore}</strong></div>
                  <div className="row between"><span>Điểm Tương quan Fair-share:</span> <strong>+{priorityResult.breakdown.fairShareScore}</strong></div>
                </div>

                <div className="alert info" style={{ marginTop: 16 }}>
                  <ArrowRightLeft size={16} />
                  <span>Thuật toán đề xuất: Người dùng có điểm ưu tiên này được quyền ưu tiên chiếm ca nếu phòng lab đầy và nhận <strong>+4h Bonus Quota</strong> đền bù ca hoán đổi.</span>
                </div>
              </div>
            ) : <p className="empty-state">Bấm nút tính để xem kết quả thuật toán</p>}
          </div>
        </div>
      )}

      {/* TAB 2: GREEN AI ESTIMATOR */}
      {activeSubTab === "green" && (
        <div className="split-layout">
          <div className="card">
            <div className="card-header">
              <Leaf size={18} className="text-success" />
              <strong>Bộ Ước Tính Công Suất & Khí Thải Carbon (Green Computing)</strong>
            </div>

            <div className="form-stack" style={{ gap: 12, marginTop: 12 }}>
              <label>
                <span>Loại hình công việc AI:</span>
                <select
                  value={estimatorInputs.modelType}
                  onChange={(e) => setEstimatorInputs({ ...estimatorInputs, modelType: e.target.value })}
                >
                  <option value="LLM_FINETUNE">Fine-tune LLM (Llama / Mistral / DeepSeek)</option>
                  <option value="VISION_TRAINING">Huấn luyện Vision Model (YOLO / ResNet)</option>
                  <option value="INFERENCE_BENCHMARK">Chạy Benchmark & Inference Test</option>
                  <option value="EMBEDDED_COMPUTE">Tính toán nhúng Raspberry Pi / Jetson</option>
                </select>
              </label>

              <label>
                <span>Số lượng GPU hoạt động:</span>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={estimatorInputs.gpuCount}
                  onChange={(e) => setEstimatorInputs({ ...estimatorInputs, gpuCount: parseInt(e.target.value) })}
                />
              </label>

              <label>
                <span>Thời gian dự kiến chạy (Giờ):</span>
                <input
                  type="number"
                  min="1"
                  value={estimatorInputs.durationHours}
                  onChange={(e) => setEstimatorInputs({ ...estimatorInputs, durationHours: parseInt(e.target.value) })}
                />
              </label>

              <button className="btn btn-primary" onClick={calculateEstimate}>Mô Phỏng Tải & Carbon Footprint</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Zap size={18} className="text-warning" />
              <strong>Chỉ Số Tiêu Thụ Năng Lượng & Môi Trường</strong>
            </div>

            {estimatorResult ? (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="metric-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="card" style={{ background: "rgba(198, 123, 21, 0.08)", border: "none" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ĐIỆN NĂNG TIÊU THỤ</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--amber)" }}>{estimatorResult.energyKwh} kWh</div>
                    <small>Tổng công suất: {estimatorResult.totalPowerWatts} W</small>
                  </div>

                  <div className="card" style={{ background: "rgba(7, 150, 132, 0.08)", border: "none" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>DẤU CHÂN CARBON (CO2)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--teal)" }}>{estimatorResult.carbonFootprintKg} kg CO₂</div>
                    <small>Chi phí điện: {new Intl.NumberFormat("vi-VN").format(estimatorResult.estimatedCostVnd)} VNĐ</small>
                  </div>
                </div>

                <div className="alert success" style={{ marginTop: 8 }}>
                  🌱 <strong>Green Recommendation:</strong> {estimatorResult.greenRecommendation.offPeakSuggestion} Giúp giảm <strong>{estimatorResult.greenRecommendation.potentialCarbonSavingsKg} kg CO₂</strong> phát thải.
                </div>
              </div>
            ) : <p className="empty-state">Bấm nút mô phỏng để tính toán</p>}
          </div>
        </div>
      )}

      {/* TAB 3: PREDICTIVE MAINTENANCE */}
      {activeSubTab === "predictive" && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8 }}>
              <ShieldAlert size={18} className="text-danger" />
              <strong>Phân Tích Dự Đoán Phân Hóa Nhiệt & Bảo Trì Dự Báo IoT (RUL Index)</strong>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={fetchPredictiveMaintenance} disabled={loadingHealth}>
              <RefreshCw size={14} className={loadingHealth ? "spin" : ""} /> Cập nhật
            </button>
          </div>

          <div className="card-list" style={{ marginTop: 16 }}>
            {loadingHealth && <p className="empty-state">⏳ Đang tải dữ liệu telemetry phân tích...</p>}
            {!loadingHealth && healthLoaded && maintenanceReports.length === 0 && (
              <p className="empty-state">📊 Chưa có dữ liệu telemetry. Các thiết bị chưa gửi thông số giám sát.</p>
            )}
            {!loadingHealth && !healthLoaded && maintenanceReports.length === 0 && (
              <p className="empty-state">Nhấn "Cập nhật" để tải dữ liệu phân tích sức khoẻ thiết bị.</p>
            )}
            {maintenanceReports.map((r) => {
              const h = r.predictiveHealth;
              return (
                <div key={r.resourceId} className="card" style={{ borderLeft: `4px solid ${h.healthIndex > 75 ? "var(--green)" : h.healthIndex > 50 ? "var(--amber)" : "var(--red)"}` }}>
                  <div className="card-header">
                    <div>
                      <strong>{r.name} ({r.code})</strong>
                      <span className="badge info" style={{ marginLeft: 8 }}>{r.type}</span>
                    </div>
                    <span className={`badge ${h.healthIndex > 75 ? "success" : h.healthIndex > 50 ? "warning" : "danger"}`}>
                      Sức khỏe RUL: {h.healthIndex}/100
                    </span>
                  </div>

                  <div className="details-grid" style={{ marginTop: 8, fontSize: 13 }}>
                    <div>Nhiệt độ TB: <strong>{h.metrics.avgTemp}°C</strong> (Độ lệch σ: {h.metrics.tempStdDev})</div>
                    <div>Công suất TB: <strong>{h.metrics.avgPowerWatts} W</strong></div>
                    <div>Ước tính RUL: <strong>{h.estimatedRulDays} ngày</strong></div>
                    <div>Mức nhiệt tích tụ: <strong style={{ color: h.thermalStressLevel === "HIGH" ? "var(--red)" : "var(--green)" }}>{h.thermalStressLevel}</strong></div>
                  </div>

                  <p className="card-text" style={{ marginTop: 8, fontSize: 12, background: "rgba(0,0,0,0.03)", padding: 8, borderRadius: 6 }}>
                    📋 <strong>Khuyến nghị bảo trì:</strong> {h.recommendation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
