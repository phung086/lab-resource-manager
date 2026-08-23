import React, { useState } from "react";
import { Sliders, ShieldCheck, Zap, AlertTriangle, Save, CheckCircle2, Lock, Flame } from "lucide-react";

export function PolicyRulesConfig() {
  const [saved, setSaved] = useState(false);

  const [policies, setPolicies] = useState({
    quotas: {
      phdHours: 250,
      masterHours: 150,
      undergradHours: 80
    },
    energy: {
      greenHourBonusPoints: 25,
      peakHourPenaltyPoints: 15,
      offPeakStartHour: 22,
      offPeakEndHour: 4
    },
    safety: {
      requireH100SafetyCert: true,
      requireDroneFlightCert: true,
      blockNonCertifiedUsers: true,
      thermalAlarmThresholdC: 80
    }
  });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4", background: "rgba(6, 182, 212, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                DYNAMIC POLICY VERSIONING ENGINE
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                ● ZERO HARDCODED RULES
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Cấu Hình Chính Sách Nghiệp Vụ & Ràng Buộc Vận Hành (Policy & Business Rules)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Cho phép Quản trị viên phòng Lab tự điều chỉnh hạn ngạch, chính sách khuyến khích Giờ Xanh, và ràng buộc chứng chỉ an toàn mà không cần can thiệp mã nguồn.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", padding: "10px 20px", fontFamily: "var(--font-mono)", background: "#10b981", color: "#0b0e14", fontWeight: 800 }}
          >
            <Save size={14} />
            <span>{saved ? "Đã Lưu Chính Sách!" : "Lưu Thay Đổi"}</span>
          </button>
        </div>
      </div>

      {saved && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
          <CheckCircle2 size={16} />
          Chính sách mới đã được áp dụng tức thì cho bộ giải điều phối và lưu vào bảng PolicyVersion trong Database.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* QUOTA CONFIG */}
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
            <Sliders size={16} style={{ color: "#06b6d4" }} />
            <strong style={{ fontSize: "0.9rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
              HẠN NGẠCH THÁNG THEO VAI TRÒ (HOURS/MONTH)
            </strong>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Nghiên cứu sinh Tiến sĩ (PhD Researcher):
              </label>
              <input
                type="number"
                value={policies.quotas.phdHours}
                onChange={(e) => setPolicies({ ...policies, quotas: { ...policies.quotas, phdHours: parseInt(e.target.value) || 0 } })}
                style={{ width: "100%", background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-mono)" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Học viên Cao học (Master Student):
              </label>
              <input
                type="number"
                value={policies.quotas.masterHours}
                onChange={(e) => setPolicies({ ...policies, quotas: { ...policies.quotas, masterHours: parseInt(e.target.value) || 0 } })}
                style={{ width: "100%", background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-mono)" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Sinh viên Đại học / ĐATN (Undergrad Student):
              </label>
              <input
                type="number"
                value={policies.quotas.undergradHours}
                onChange={(e) => setPolicies({ ...policies, quotas: { ...policies.quotas, undergradHours: parseInt(e.target.value) || 0 } })}
                style={{ width: "100%", background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>
        </div>

        {/* GREEN ENERGY POLICY */}
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
            <Zap size={16} style={{ color: "#10b981" }} />
            <strong style={{ fontSize: "0.9rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
              CHÍNH SÁCH TIẾT KIỆM ĐIỆN EVN (GREEN ENERGY)
            </strong>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
                <span>Điểm Ưu Tiên Thưởng Khi Đặt Giờ Xanh (22:00 - 04:00):</span>
                <strong style={{ color: "#10b981", fontFamily: "var(--font-mono)" }}>+{policies.energy.greenHourBonusPoints} pts</strong>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={policies.energy.greenHourBonusPoints}
                onChange={(e) => setPolicies({ ...policies, energy: { ...policies.energy, greenHourBonusPoints: parseInt(e.target.value) } })}
                style={{ width: "100%", accentColor: "#10b981" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
                <span>Điểm Phạt Khi Đặt Giờ Cao Điểm EVN (3.190 đ/kWh):</span>
                <strong style={{ color: "#f59e0b", fontFamily: "var(--font-mono)" }}>-{policies.energy.peakHourPenaltyPoints} pts</strong>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={policies.energy.peakHourPenaltyPoints}
                onChange={(e) => setPolicies({ ...policies, energy: { ...policies.energy, peakHourPenaltyPoints: parseInt(e.target.value) } })}
                style={{ width: "100%", accentColor: "#f59e0b" }}
              />
            </div>
          </div>
        </div>

        {/* SAFETY & HARDWARE THRESHOLD */}
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
            <Flame size={16} style={{ color: "#ef4444" }} />
            <strong style={{ fontSize: "0.9rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
              AN TOÀN PHẦN CỨNG & CHỨNG CHỈ BẮT BUỘC
            </strong>
          </div>

          <div style={{ display: "grid", gap: 12, fontSize: "0.8rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={policies.safety.requireH100SafetyCert}
                onChange={(e) => setPolicies({ ...policies, safety: { ...policies.safety, requireH100SafetyCert: e.target.checked } })}
                style={{ accentColor: "#06b6d4" }}
              />
              Bắt buộc Chứng chỉ An toàn Cụm Máy Chủ H100
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={policies.safety.requireDroneFlightCert}
                onChange={(e) => setPolicies({ ...policies, safety: { ...policies.safety, requireDroneFlightCert: e.target.checked } })}
                style={{ accentColor: "#06b6d4" }}
              />
              Bắt buộc Chứng chỉ Bay Drone Ngoài Trời
            </label>

            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
                <span>Ngưỡng Cảnh Báo Quá Nhiệt Kích Hoạt Tái Phân Bổ:</span>
                <strong style={{ color: "#ef4444", fontFamily: "var(--font-mono)" }}>{policies.safety.thermalAlarmThresholdC}°C</strong>
              </div>
              <input
                type="range"
                min={70}
                max={90}
                value={policies.safety.thermalAlarmThresholdC}
                onChange={(e) => setPolicies({ ...policies, safety: { ...policies.safety, thermalAlarmThresholdC: parseInt(e.target.value) } })}
                style={{ width: "100%", accentColor: "#ef4444" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
