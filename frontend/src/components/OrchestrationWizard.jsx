import React, { useState } from "react";
import { Sparkles, Cpu, Clock, CheckCircle2, ArrowRight, ShieldCheck, Leaf, Award, Zap, RefreshCw, AlertCircle, Server, Activity, Database, Flame, Check } from "lucide-react";

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

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const hardwareCards = [
    {
      id: "gpu_server",
      name: "Cụm Máy Chủ GPU SXM5",
      model: "NVIDIA H100 80GB HBM3",
      vram: 80,
      power: "550W",
      tag: "Hiệu năng cực đại",
      tone: "blue",
      desc: "Phù hợp huấn luyện mô hình ngôn ngữ lớn (LLM), Diffusion 3D và Paper CVPR/NeurIPS."
    },
    {
      id: "gpu_server_l40s",
      name: "Cụm GPU Workstation",
      model: "NVIDIA L40S 48GB GDDR6",
      vram: 48,
      power: "380W",
      tag: "Cân bằng tải & ĐATN",
      tone: "cyan",
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
      tone: "emerald",
      desc: "Nghiên cứu suy luận thời gian thực trên biên (Edge AI) và Robotics."
    }
  ];

  const urgencyOptions = [
    { id: "paper_deadline", label: "Nộp Bài Báo Q1/Q2 (Khẩn Cấp)", weight: "Ưu Tiên 100", tone: "red" },
    { id: "thesis_defense", label: "Bảo Vệ Đồ Án Tốt Nghiệp", weight: "Ưu Tiên 90", tone: "blue" },
    { id: "course_project", label: "Bài Tập Lớn Môn Học", weight: "Ưu Tiên 60", tone: "amber" },
    { id: "personal_learning", label: "Nghiên Cứu Cá Nhân", weight: "Ưu Tiên 30", tone: "slate" }
  ];

  async function submitRequirement(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/allocations/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không tìm thấy phương án phân bổ phù hợp.");
      }

      setProposal(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAllocation() {
    if (!proposal?.allocation?.id) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/allocations/${proposal.allocation.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Xác nhận phân bổ thất bại.");
      }

      setConfirmedBooking(data.booking);
      setStep(3);
      if (onAllocated) onAllocated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 24, maxWidth: 1080, margin: "0 auto" }}>
      {/* HERO BANNER & STEPPER */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(16, 185, 129, 0.05) 100%)",
          border: "1px solid rgba(37, 99, 235, 0.2)",
          boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.08)",
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge info" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8", fontWeight: 700 }}>
                GOLDEN FLOW ORCHESTRATION
              </span>
              <span className="badge success">NSGA-II V2 Engine</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: "8px 0 4px 0" }}>
              Điều Phối Phân Bổ Tài Nguyên Thông Minh
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 640 }}>
              Trục điều phối 5 bước: Khớp nối nhu cầu nghiên cứu $\to$ Lọc ràng buộc an toàn $\to$ Tối ưu hóa đa mục tiêu NSGA-II $\to$ Bóc tách giải trình Pareto $\to$ Cam kết giao dịch an toàn.
            </p>
          </div>

          {/* STEP INDICATOR */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255, 255, 255, 0.9)", padding: "8px 16px", borderRadius: 30, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.85rem", color: step >= 1 ? "#2563eb" : "#94a3b8" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 1 ? "#2563eb" : "#e2e8f0", color: "#fff", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>1</span>
              <span>Đặc Tả</span>
            </div>
            <ArrowRight size={14} style={{ color: "#cbd5e1" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.85rem", color: step >= 2 ? "#2563eb" : "#94a3b8" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 2 ? "#2563eb" : "#e2e8f0", color: "#fff", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>2</span>
              <span>Tối Ưu Pareto</span>
            </div>
            <ArrowRight size={14} style={{ color: "#cbd5e1" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.85rem", color: step >= 3 ? "#10b981" : "#94a3b8" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: step >= 3 ? "#10b981" : "#e2e8f0", color: "#fff", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>3</span>
              <span>Cam Kết</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}

      {/* STEP 1: REQUIREMENT FORM */}
      {step === 1 && (
        <form onSubmit={submitRequirement} className="content-stack" style={{ gap: 20 }}>
          {/* HARDWARE CARDS GRID */}
          <div>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
              1. Chọn Loại Tài Nguyên Phần Cứng Mục Tiêu:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {hardwareCards.map((card) => {
                const isSelected = formData.resourceType === card.id || (card.id === "gpu_server_l40s" && formData.resourceType === "gpu_server" && formData.minVramGb === 48);
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
                      borderRadius: 14,
                      border: isSelected ? "2px solid #2563eb" : "1px solid rgba(148, 163, 184, 0.25)",
                      background: isSelected ? "rgba(37, 99, 235, 0.05)" : "rgba(255, 255, 255, 0.8)",
                      boxShadow: isSelected ? "0 12px 24px -6px rgba(37, 99, 235, 0.18)" : "0 4px 6px -1px rgba(0, 0, 0, 0.03)",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      transform: isSelected ? "translateY(-2px)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span className="badge" style={{ background: isSelected ? "#2563eb" : "#f1f5f9", color: isSelected ? "#fff" : "#475569", fontWeight: 700 }}>
                        {card.tag}
                      </span>
                      {isSelected && (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center" }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", fontFamily: "var(--font-heading)" }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: 600, margin: "2px 0 6px 0" }}>
                      {card.model}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4, margin: 0 }}>
                      {card.desc}
                    </p>

                    <div style={{ display: "flex", gap: 8, marginTop: 12, fontSize: "0.75rem", color: "#64748b" }}>
                      {card.vram > 0 && <span style={{ background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 4 }}>VRAM: <strong>{card.vram}GB</strong></span>}
                      <span style={{ background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 4 }}>Công suất: <strong>{card.power}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* URGENCY & DURATION SECTION */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* URGENCY */}
            <div className="card" style={{ padding: 18 }}>
              <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                2. Mục Đích & Mức Độ Ưu Tiên Học Thuật:
              </label>
              <div style={{ display: "grid", gap: 8 }}>
                {urgencyOptions.map((urg) => {
                  const isSelected = formData.projectUrgency === urg.id;
                  return (
                    <div
                      key={urg.id}
                      onClick={() => setFormData({ ...formData, projectUrgency: urg.id })}
                      style={{
                        cursor: "pointer",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #2563eb" : "1px solid rgba(148, 163, 184, 0.2)",
                        background: isSelected ? "rgba(37, 99, 235, 0.06)" : "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#1d4ed8" : "#334155" }}>
                        {urg.label}
                      </span>
                      <span className="badge" style={{ fontSize: "0.75rem", background: isSelected ? "#2563eb" : "#f1f5f9", color: isSelected ? "#fff" : "#64748b" }}>
                        {urg.weight}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DURATION & TIME SLOT */}
            <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                  3. Thời Lượng Dự Kiến & Khung Giờ Mong Muốn:
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <label>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Thời lượng:</span>
                    <select
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                    >
                      <option value={60}>1 Giờ</option>
                      <option value={120}>2 Giờ</option>
                      <option value={180}>3 Giờ (Khuyên dùng)</option>
                      <option value={240}>4 Giờ</option>
                      <option value={360}>6 Giờ (Batch Job)</option>
                    </select>
                  </label>

                  <label>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Bắt đầu từ:</span>
                    <select
                      value={formData.preferredStartHour}
                      onChange={(e) => setFormData({ ...formData, preferredStartHour: parseInt(e.target.value) })}
                    >
                      <option value={22}>22:00 (🌿 Giờ Xanh EVN 1.100 đ)</option>
                      <option value={8}>08:00 (Tiêu chuẩn 1.685 đ)</option>
                      <option value={10}>10:00 (⚠️ Giờ Cao điểm 3.190 đ)</option>
                      <option value={14}>14:00 (Tiêu chuẩn 1.685 đ)</option>
                      <option value={18}>18:00 (⚠️ Giờ Cao điểm 3.190 đ)</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Bộ giải thuật toán:</span>
                  <select
                    value={formData.algorithm}
                    onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
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
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.4)"
                }}
              >
                <Sparkles size={18} />
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
            className="card"
            style={{
              padding: "24px 28px",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 253, 244, 0.6))",
              boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.12)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge success" style={{ fontWeight: 800 }}>PARETO RANK 1 KNEE-POINT</span>
                  <span className="badge info">Runtime: {proposal.provenance?.runtimeMs} ms</span>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-heading)", marginTop: 6 }}>
                  {proposal.allocation?.resource?.name} ({proposal.allocation?.resource?.code})
                </div>
                <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "2px 0 0 0" }}>
                  Khung giờ phân bổ: <strong>{new Date(proposal.allocation.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(proposal.allocation.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</strong>
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Ước tính chi phí điện năng EVN:</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#059669" }}>
                  {proposal.allocation?.energyScore > 80 ? "4.400 đ (Giờ Xanh)" : "12.800 đ"}
                </div>
              </div>
            </div>

            {/* EXPLANATION ACCORDION */}
            <div style={{ marginTop: 20, padding: 18, background: "rgba(255, 255, 255, 0.8)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
              <strong style={{ fontSize: "0.95rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <Award size={18} className="text-primary" />
                Giải Trình Khoa Học Tự Động Từ Thuật Toán (Decision Provenance):
              </strong>
              <p style={{ fontSize: "0.9rem", color: "#334155", margin: "8px 0 16px 0", lineHeight: 1.6 }}>
                {proposal.explanation?.humanExplanation || "Phương án đạt điểm tối ưu trong không gian đa mục tiêu Pareto Frontier."}
              </p>

              {/* FACTOR PROGRESS BARS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>
                    <span>Đóng góp Độ Ưu Tiên:</span>
                    <strong>+{proposal.explanation?.priorityContribution || 92} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${proposal.explanation?.priorityContribution || 92}%`, height: "100%", background: "#2563eb" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>
                    <span>Tiết Kiệm Giờ Xanh EVN:</span>
                    <strong>+{proposal.explanation?.energySavingScore || 25} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${(proposal.explanation?.energySavingScore || 25) * 4}%`, height: "100%", background: "#10b981" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>
                    <span>Chỉ Số Công Bằng Jain:</span>
                    <strong>+{proposal.explanation?.fairnessGain || 12} pts</strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: "85%", height: "100%", background: "#8b5cf6" }} />
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
                style={{ flex: 1, padding: "12px 18px", fontWeight: 600 }}
              >
                Quay Lại Điều Chỉnh
              </button>
              <button
                type="button"
                className="btn btn-success"
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
                  fontSize: "1rem",
                  boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)"
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
          className="card"
          style={{
            maxWidth: 680,
            margin: "0 auto",
            textAlign: "center",
            padding: "40px 32px",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            background: "linear-gradient(180deg, #ffffff, rgba(240, 253, 244, 0.5))",
            boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.15)"
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px auto"
            }}
          >
            <CheckCircle2 size={42} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
            Phân Bổ Tài Nguyên Đã Được Cam Kết Thành Công!
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 24px 0", lineHeight: 1.6 }}>
            Mã Đơn Đặt: <strong style={{ color: "#0f172a" }}>#{confirmedBooking.id.slice(0, 8)}</strong> — Đã thực thi giao dịch với cơ chế bảo vệ khoá dòng (Pessimistic Row Lock), cam kết 0 xung đột và ghi nhận lịch sử vào Bản sao số.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep(1);
                setProposal(null);
                setConfirmedBooking(null);
              }}
              style={{ padding: "10px 24px", fontWeight: 700 }}
            >
              Tạo Yêu Cầu Phân Bổ Mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
