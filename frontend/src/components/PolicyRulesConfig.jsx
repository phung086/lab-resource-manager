import React, { useState, useEffect } from "react";
import { Sliders, ShieldCheck, Zap, Save, CheckCircle2, RefreshCw } from "lucide-react";
import { apiRequest } from "../api.js";

export function PolicyRulesConfig() {
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLabs();
  }, []);

  async function loadLabs() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/labs");
      const labList = data.data || [];
      setLabs(labList);
      if (labList.length > 0) {
        setSelectedLabId(labList[0].id);
        setPolicy(labList[0].labPolicy || getDefaultPolicy());
      }
    } catch (err) {
      setError("Không thể tải danh sách phòng lab: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function getDefaultPolicy() {
    return {
      maxBookingMinutes: 480,
      minBookingMinutes: 15,
      maxAdvanceBookingDays: 30,
      checkInGraceMinutes: 20,
      requiresApproval: false,
      allowWeekend: false,
      workDayStartHour: 8,
      workDayEndHour: 18
    };
  }

  function handleLabChange(e) {
    const labId = e.target.value;
    setSelectedLabId(labId);
    const lab = labs.find(l => l.id === labId);
    setPolicy(lab?.labPolicy || getDefaultPolicy());
  }

  function updatePolicy(field, value) {
    setPolicy(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!selectedLabId || !policy) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/labs/${selectedLabId}/policy`, {
        method: "PUT",
        body: JSON.stringify({
          maxBookingMinutes: policy.maxBookingMinutes,
          minBookingMinutes: policy.minBookingMinutes,
          maxAdvanceBookingDays: policy.maxAdvanceBookingDays,
          checkInGraceMinutes: policy.checkInGraceMinutes,
          requiresApproval: policy.requiresApproval,
          allowWeekend: policy.allowWeekend,
          workDayStartHour: policy.workDayStartHour,
          workDayEndHour: policy.workDayEndHour
        })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Update local state without full reload
      setLabs(labs.map(l => l.id === selectedLabId ? { ...l, labPolicy: policy } : l));
    } catch (err) {
      setError("Không thể lưu cấu hình: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)" }}>
                DYNAMIC POLICY ENGINE
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Cấu Hình Chính Sách Nghiệp Vụ
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Điều chỉnh giới hạn đặt lịch, thời gian hoạt động và quy tắc phê duyệt cho từng phòng lab.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !policy}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", padding: "10px 20px", fontFamily: "var(--font-mono)", background: "var(--green)", color: "var(--bg)", fontWeight: 700, opacity: (saving || !policy) ? 0.6 : 1 }}
          >
            <Save size={14} />
            <span>{saving ? "Đang lưu..." : (saved ? "Đã Lưu!" : "Lưu Thay Đổi")}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--red) 12%, transparent)", border: "1px solid var(--red)", borderRadius: 6, padding: "12px 16px", color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{ background: "color-mix(in srgb, var(--green) 12%, transparent)", border: "1px solid var(--green)", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
          <CheckCircle2 size={16} />
          Chính sách đã được lưu thành công.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Đang tải danh sách Lab và cấu hình...
        </div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>Chọn Phòng Lab:</label>
            <select
              value={selectedLabId}
              onChange={handleLabChange}
              style={{ flex: 1, maxWidth: 400, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 6 }}
            >
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>
              ))}
            </select>
          </div>

          {policy && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
              {/* QUOTA CONFIG */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <Sliders size={16} style={{ color: "var(--amber)" }} />
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    GIỚI HẠN ĐẶT LỊCH
                  </strong>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Thời gian đặt tối đa (phút/lần):</label>
                    <input type="number" value={policy.maxBookingMinutes} onChange={e => updatePolicy("maxBookingMinutes", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Thời gian đặt tối thiểu (phút/lần):</label>
                    <input type="number" value={policy.minBookingMinutes} onChange={e => updatePolicy("minBookingMinutes", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Cho phép đặt trước tối đa (ngày):</label>
                    <input type="number" value={policy.maxAdvanceBookingDays} onChange={e => updatePolicy("maxAdvanceBookingDays", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                </div>
              </div>

              {/* SCHEDULE CONFIG */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <Zap size={16} style={{ color: "var(--green)" }} />
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    THỜI GIAN HOẠT ĐỘNG
                  </strong>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Giờ mở cửa (0-23):</label>
                    <input type="number" min="0" max="23" value={policy.workDayStartHour} onChange={e => updatePolicy("workDayStartHour", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Giờ đóng cửa (1-24):</label>
                    <input type="number" min="1" max="24" value={policy.workDayEndHour} onChange={e => updatePolicy("workDayEndHour", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--surface-strong)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
                    <input type="checkbox" checked={policy.allowWeekend} onChange={e => updatePolicy("allowWeekend", e.target.checked)} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>Cho phép hoạt động vào cuối tuần</span>
                  </label>
                </div>
              </div>

              {/* COMPLIANCE CONFIG */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <ShieldCheck size={16} style={{ color: "var(--amber)" }} />
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    KIỂM SOÁT VÀ PHÊ DUYỆT
                  </strong>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Thời gian ân hạn Check-in (phút):</label>
                    <input type="number" value={policy.checkInGraceMinutes} onChange={e => updatePolicy("checkInGraceMinutes", parseInt(e.target.value) || 0)} style={{ width: 100, background: "var(--surface-strong)", border: "1px solid var(--line-strong)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 4 }} />
                  </div>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--surface-strong)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
                    <input type="checkbox" checked={policy.requiresApproval} onChange={e => updatePolicy("requiresApproval", e.target.checked)} />
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>Bắt buộc Admin phê duyệt</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Mọi lịch đặt đều cần duyệt thủ công</div>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
