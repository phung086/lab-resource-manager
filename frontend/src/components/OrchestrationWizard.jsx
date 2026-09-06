import React, { useState } from "react";
import { Sparkles, Cpu, Clock, CheckCircle2, ArrowRight, ShieldCheck, Leaf, Award, Zap, RefreshCw, AlertCircle, Server, Activity, Database, Flame, Check } from "lucide-react";
import { apiRequest } from "../api.js";

export function OrchestrationWizard({ onAllocated }) {
  const [step, setStep] = useState(1); // 1: Input Requirement, 2: Optimization Outcome, 3: Confirmed
  const [formData, setFormData] = useState({
    resourceType: "gpu_server",
    minVramGb: 80,
    durationMinutes: 180,
    projectUrgency: "thesis_defense",
    preferredStartHour: 22,
    algorithm: "NSGA2"
  });

  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [error, setError] = useState("");

  const hardwareCards = [
    {
      id: "gpu_server",
      name: "Cụm Máy Chủ GPU SXM5",
      model: "NVIDIA H100 80GB HBM3",
      vram: 80,
      power: "550W",
      tag: "Hiệu năng cực đại",
      tone: "amber",
      desc: "Phù hợp huấn luyện mô hình ngôn ngữ lớn (LLM), Diffusion 3D và Paper CVPR/NeurIPS."
    },
    {
      id: "gpu_server_l40s",
      name: "Cụm GPU Workstation",
      model: "NVIDIA L40S 48GB GDDR6",
      vram: 48,
      power: "380W",
      tag: "Cân bằng tải & ĐATN",
      tone: "purple",
      desc: "Tối ưu cho bài toán Thị giác máy tính YOLOV11, Fine-tuning BERT và ĐATN."
    },
    {
      id: "uav",
      name: "Thiết Bị Bay UAV Tự Hành",
      model: "Matrice 300 RTK Quadcopter",
      vram: 0,
      power: "Pin 5880mAh",
      tag: "Thực nghiệm ngoài trời",
      tone: "amber",
      desc: "Khảo sát địa hình 3D, kiểm thử thuật toán SLAM và camera nhiệt hồng ngoại."
    },
    {
      id: "raspberry_pi",
      name: "Cụm Kit Nhúng Edge AI",
      model: "NVIDIA Jetson AGX Orin 64GB",
      vram: 64,
      power: "60W",
      tag: "Tiết kiệm năng lượng",
      tone: "green",
      desc: "Nghiên cứu suy luận thời gian thực trên biên (Edge AI) và Robotics."
    }
  ];

  const urgencyOptions = [
    { id: "paper_deadline", label: "Nộp Bài Báo Q1/Q2 (Khẩn Cấp)", weight: "Ưu Tiên 100", tone: "red" },
    { id: "thesis_defense", label: "Bảo Vệ Đồ Án Tốt Nghiệp", weight: "Ưu Tiên 90", tone: "amber" },
    { id: "course_project", label: "Bài Tập Lớn Môn Học", weight: "Ưu Tiên 60", tone: "green" },
    { id: "personal_learning", label: "Nghiên Cứu Cá Nhân", weight: "Ưu Tiên 30", tone: "muted" }
  ];

  async function submitRequirement(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/allocations/request", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (!data.success) {
        throw new Error(data.message || "Không tìm thấy phương án phân bổ phù hợp.");
      }

      setProposal(data);
      setStep(2);
    } catch (err) {
      setError(err.message || "Lỗi gửi yêu cầu phân bổ.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAllocation() {
    if (!proposal?.allocation?.id) return;
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/allocations/${proposal.allocation.id}/confirm`, {
        method: "POST"
      });

      if (!data.success) {
        throw new Error(data.message || "Xác nhận phân bổ thất bại.");
      }

      setConfirmedBooking(data.booking);
      setStep(3);
      if (onAllocated) onAllocated();
    } catch (err) {
      setError(err.message || "Lỗi xác nhận phân bổ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 24, maxWidth: 1080, margin: "0 auto" }}>
      {/* HERO BANNER & STEPPER */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)", fontWeight: 700 }}>
                GOLDEN FLOW ORCHESTRATION
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)" }}>
                NSGA-II V2 Engine
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: "8px 0 4px 0" }}>
              Điều Phối Phân Bổ Tài Nguyên Thông Minh
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 640, margin: 0 }}>
              Trục điều phối 5 bước: Khớp nối nhu cầu nghiên cứu &rarr; Lọc ràng buộc an toàn &rarr; Tối ưu hóa đa mục tiêu NSGA-II &rarr; Bóc tách giải trình Pareto &rarr; Cam kết giao dịch an toàn.
            </p>
          </div>

          {/* STEP INDICATOR */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-strong)", padding: "8px 16px", borderRadius: 30, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.82rem", color: step >= 1 ? "var(--amber)" : "var(--text-muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 1 ? "var(--amber)" : "var(--line)", color: step >= 1 ? "var(--bg)" : "var(--text-muted)", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>1</span>
              <span>Đặc Tả</span>
            </div>
            <ArrowRight size={14} style={{ color: "var(--line-strong)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.82rem", color: step >= 2 ? "var(--amber)" : "var(--text-muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 2 ? "var(--amber)" : "var(--line)", color: step >= 2 ? "var(--bg)" : "var(--text-muted)", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>2</span>
              <span>Tối Ưu Pareto</span>
            </div>
            <ArrowRight size={14} style={{ color: "var(--line-strong)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.82rem", color: step >= 3 ? "var(--green)" : "var(--text-muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 3 ? "var(--green)" : "var(--line)", color: step >= 3 ? "var(--bg)" : "var(--text-muted)", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>3</span>
              <span>Cam Kết</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--red) 12%, transparent)", border: "1px solid var(--red)", borderRadius: 6, padding: "12px 16px", color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* STEP 1: REQUIREMENT FORM */}
      {step === 1 && (
        <form onSubmit={submitRequirement} className="content-stack" style={{ gap: 20 }}>
          {/* HARDWARE CARDS GRID */}
          <div>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              1. Chọn Loại Tài Nguyên Phần Cứng Mục Tiêu:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {hardwareCards.map((card) => {
                const isSelected = formData.resourceType === card.id || (card.id === "gpu_server_l40s" && formData.resourceType === "gpu_server" && formData.minVramGb === 48);
                const toneColor = card.tone === "green" ? "var(--green)" : card.tone === "purple" ? "var(--purple)" : "var(--amber)";

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        resourceType: card.id.startsWith("gpu_server") ? "gpu_server" : card.id,
                        minVramGb: card.vram
                      });
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "16px 18px",
                      borderRadius: 8,
                      border: isSelected ? `2px solid ${toneColor}` : "1px solid var(--line)",
                      background: isSelected ? `color-mix(in srgb, ${toneColor} 10%, var(--surface))` : "var(--surface)",
                      boxShadow: isSelected ? `0 8px 20px -4px color-mix(in srgb, ${toneColor} 25%, transparent)` : "none",
                      transition: "all 0.2s ease",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", background: "var(--surface-strong)", border: "1px solid var(--line)", color: toneColor, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                        {card.tag}
                      </span>
                      {isSelected && (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: toneColor, color: "var(--bg)", display: "grid", placeItems: "center" }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: toneColor, fontWeight: 600, margin: "2px 0 6px 0", fontFamily: "var(--font-mono)" }}>
                      {card.model}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                      {card.desc}
                    </p>

                    <div style={{ display: "flex", gap: 8, marginTop: 12, fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {card.vram > 0 && <span style={{ background: "var(--surface-strong)", padding: "2px 6px", borderRadius: 4 }}>VRAM: <strong>{card.vram}GB</strong></span>}
                      <span style={{ background: "var(--surface-strong)", padding: "2px 6px", borderRadius: 4 }}>Công suất: <strong>{card.power}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* URGENCY & DURATION SECTION */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* URGENCY */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 18 }}>
              <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                2. Mục Đích & Mức Độ Ưu Tiên Học Thuật:
              </label>
              <div style={{ display: "grid", gap: 8 }}>
                {urgencyOptions.map((urg) => {
                  const isSelected = formData.projectUrgency === urg.id;
                  const urgTone = urg.tone === "red" ? "var(--red)" : urg.tone === "green" ? "var(--green)" : "var(--amber)";
                  return (
                    <div
                      key={urg.id}
                      onClick={() => setFormData({ ...formData, projectUrgency: urg.id })}
                      style={{
                        cursor: "pointer",
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: isSelected ? `2px solid ${urgTone}` : "1px solid var(--line)",
                        background: isSelected ? `color-mix(in srgb, ${urgTone} 10%, var(--surface-strong))` : "var(--surface-strong)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontSize: "0.82rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? urgTone : "var(--text-primary)" }}>
                        {urg.label}
                      </span>
                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 4, background: isSelected ? urgTone : "var(--surface)", color: isSelected ? "var(--bg)" : "var(--text-muted)" }}>
                        {urg.weight}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DURATION & TIME SLOT */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  3. Thời Lượng Dự Kiến & Khung Giờ Mong Muốn:
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <label>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Thời lượng:</span>
                    <select
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 6 }}
                    >
                      <option value={60}>1 Giờ</option>
                      <option value={120}>2 Giờ</option>
                      <option value={180}>3 Giờ (Khuyên dùng)</option>
                      <option value={240}>4 Giờ</option>
                      <option value={360}>6 Giờ (Batch Job)</option>
                    </select>
                  </label>

                  <label>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Bắt đầu từ:</span>
                    <select
                      value={formData.preferredStartHour}
                      onChange={(e) => setFormData({ ...formData, preferredStartHour: parseInt(e.target.value) })}
                      style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 6 }}
                    >
                      <option value={22}>22:00 (Giờ Xanh EVN 1.100 đ)</option>
                      <option value={8}>08:00 (Tiêu chuẩn 1.685 đ)</option>
                      <option value={10}>10:00 (Giờ Cao điểm 3.190 đ)</option>
                      <option value={14}>14:00 (Tiêu chuẩn 1.685 đ)</option>
                      <option value={18}>18:00 (Giờ Cao điểm 3.190 đ)</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Bộ giải thuật toán:</span>
                  <select
                    value={formData.algorithm}
                    onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                    style={{ width: "100%", background: "var(--surface-strong)", border: "1px solid var(--line)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 6 }}
                  >
                    <option value="NSGA2">NSGA-II (Tiến hóa Đa mục tiêu Pareto - Khuyên Dùng)</option>
                    <option value="GA">Single-tier GA (Có trọng số)</option>
                    <option value="GREEDY">Greedy Priority Scheduler</option>
                    <option value="FIFO">FIFO Baseline</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "12px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  background: "var(--amber)",
                  color: "var(--bg)"
                }}
              >
                <Sparkles size={16} />
                <span>{loading ? "Đang giải bài toán tối ưu hóa NSGA-II..." : "Tìm Phương Án Phân Bổ Tối Ưu"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: OPTIMIZATION OUTCOME */}
      {step === 2 && proposal && (
        <div className="content-stack" style={{ gap: 20 }}>
          {/* RESULT CARD */}
          <div
            style={{
              padding: "24px 28px",
              border: "1px solid var(--green)",
              background: "var(--surface)",
              borderRadius: 8
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                    PARETO RANK 1 KNEE-POINT
                  </span>
                  <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 12%, transparent)", padding: "2px 8px", borderRadius: 4 }}>
                    Runtime: {proposal.provenance?.runtimeMs} ms
                  </span>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", marginTop: 6 }}>
                  {proposal.allocation?.resource?.name} ({proposal.allocation?.resource?.code})
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                  Khung giờ phân bổ: <strong>{new Date(proposal.allocation.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(proposal.allocation.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</strong>
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ước tính chi phí điện năng EVN:</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                  {proposal.allocation?.energyScore > 80 ? "4.400 đ (Giờ Xanh)" : "12.800 đ"}
                </div>
              </div>
            </div>

            {/* EXPLANATION ACCORDION */}
            <div style={{ marginTop: 20, padding: 18, background: "var(--surface-strong)", borderRadius: 8, border: "1px solid var(--line)" }}>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-heading)" }}>
                <Award size={18} style={{ color: "var(--amber)" }} />
                Giải Trình Khoa Học Tự Động Từ Thuật Toán (Decision Provenance):
              </strong>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "8px 0 16px 0", lineHeight: 1.6 }}>
                {proposal.explanation?.humanExplanation || "Phương án đạt điểm tối ưu trong không gian đa mục tiêu Pareto Frontier."}
              </p>

              {/* FACTOR PROGRESS BARS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                    <span>Đóng góp Độ Ưu Tiên:</span>
                    <strong style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>+{proposal.explanation?.priorityContribution || 92} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${proposal.explanation?.priorityContribution || 92}%`, height: "100%", background: "var(--amber)" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                    <span>Tiết Kiệm Giờ Xanh EVN:</span>
                    <strong style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>+{proposal.explanation?.energySavingScore || 25} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${(proposal.explanation?.energySavingScore || 25) * 4}%`, height: "100%", background: "var(--green)" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                    <span>Chỉ Số Công Bằng Jain:</span>
                    <strong style={{ color: "var(--purple)", fontFamily: "var(--font-mono)" }}>+{proposal.explanation?.fairnessGain || 12} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: "85%", height: "100%", background: "var(--purple)" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: "12px 18px", fontWeight: 600, border: "1px solid var(--line)" }}
              >
                Quay Lại Điều Chỉnh
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmAllocation}
                disabled={loading}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "12px 22px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  background: "var(--green)",
                  color: "var(--bg)"
                }}
              >
                <CheckCircle2 size={18} />
                <span>{loading ? "Đang xác nhận & khóa dòng Database..." : "Xác Nhận Đặt Chỗ Ngay (Confirm Transaction)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRMED CELEBRATION */}
      {step === 3 && confirmedBooking && (
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            textAlign: "center",
            padding: "40px 32px",
            border: "1px solid var(--green)",
            background: "var(--surface)",
            borderRadius: 8
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--green) 15%, transparent)",
              color: "var(--green)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px auto"
            }}
          >
            <CheckCircle2 size={42} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            Phân Bổ Tài Nguyên Đã Được Cam Kết Thành Công!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 24px 0", lineHeight: 1.6 }}>
            Mã Đơn Đặt: <strong style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>#{confirmedBooking.id.slice(0, 8)}</strong> — Đã thực thi giao dịch với cơ chế bảo vệ khoá dòng (Pessimistic Row Lock), cam kết 0 xung đột và ghi nhận lịch sử vào Bản sao số.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep(1);
                setProposal(null);
                setConfirmedBooking(null);
              }}
              style={{ padding: "10px 24px", fontWeight: 700, background: "var(--amber)", color: "var(--bg)" }}
            >
              Tạo Yêu Cầu Phân Bổ Mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
