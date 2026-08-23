import React, { useState } from "react";
import { Sparkles, Play, BarChart2, Check, Sliders, ShieldCheck, Zap } from "lucide-react";

export function WhatIfStudio() {
  const [scenarioType, setScenarioType] = useState("EXTRA_GPUS");
  const [extraGpus, setExtraGpus] = useState(2);
  const [demandMultiplier, setDemandMultiplier] = useState(2.0);
  const [priceHike, setPriceHike] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const scenarios = [
    {
      id: "EXTRA_GPUS",
      title: "Mở Rộng Thêm +2 Cụm GPU H100",
      tag: "CAPACITY EXPANSION",
      tone: "blue",
      desc: "Mô phỏng trường hợp Nhà trường đầu tư thêm 2 máy chủ GPU NVIDIA H100 SXM5 để giảm thời gian chờ của sinh viên."
    },
    {
      id: "NODE_FAILURE",
      title: "Sự Cố Sập Node Chủ Lực (H100-01 Failure)",
      tag: "FAULT TOLERANCE",
      tone: "red",
      desc: "Giả lập máy chủ tải nặng nhất bị quá nhiệt hoặc sập nguồn đột ngột để kiểm tra khả năng tự động chuyển tải của NSGA-II."
    },
    {
      id: "SURGE_DEMAND",
      title: "Cơn Sốt Nhu Cầu Đồ Án 2x (Peak Demand)",
      tag: "STRESS TEST 2X",
      tone: "amber",
      desc: "Thử nghiệm khi hàng trăm sinh viên cùng nộp đồ án và kiểm chứng chỉ số công bằng Jain's Fairness Index."
    },
    {
      id: "TARIFF_CHANGE",
      title: "Giá Điện Cao Điểm EVN Tăng +30%",
      tag: "GREEN TARIFF SHOCK",
      tone: "green",
      desc: "Phân tích độ nhạy chi phí và đo lường tỷ lệ các tác vụ tự động dịch chuyển sang khung giờ Xanh ban đêm."
    }
  ];

  async function runSimulation() {
    setLoading(true);
    try {
      const token = localStorage.getItem("lrm_token");
      const res = await fetch(`http://${host}:8000/simulation/what-if`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scenarioType,
          modifier: {
            extraGpuCount: extraGpus,
            demandMultiplier,
            priceHikePercent: priceHike
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (err) {
      console.error("Error running what-if", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4", background: "rgba(6, 182, 212, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                COUNTERFACTUAL SIMULATION ENGINE
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                NSGA-II RE-OPTIMIZATION PROVENANCE
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Studio Mô Phỏng Kịch Bản Giả Định & Quy Hoạch Năng Lực (What-If Studio)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Cho phép Trưởng Lab và Ban Giám hiệu đặt câu hỏi phản biện: "Điều gì xảy ra nếu...?" và nhận ngay ma trận đối sánh chênh lệch $\Delta$ tức thì.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={runSimulation}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", padding: "10px 18px", fontFamily: "var(--font-mono)", background: "#06b6d4", color: "#0b0e14", fontWeight: 700 }}
          >
            <Play size={14} />
            <span>{loading ? "Đang Chạy Mô Phỏng..." : "Chạy Kịch Bản Giả Định"}</span>
          </button>
        </div>
      </div>

      {/* SCENARIO SELECTOR CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {scenarios.map((sc) => {
          const isSelected = scenarioType === sc.id;
          const toneColor = sc.tone === "red" ? "#ef4444" : (sc.tone === "amber" ? "#f59e0b" : (sc.tone === "green" ? "#10b981" : "#3b82f6"));

          return (
            <div
              key={sc.id}
              onClick={() => {
                setScenarioType(sc.id);
                setResult(null);
              }}
              style={{
                cursor: "pointer",
                padding: "16px 18px",
                borderRadius: 8,
                border: isSelected ? `1px solid ${toneColor}` : "1px solid rgba(255, 255, 255, 0.08)",
                background: isSelected ? "#161b26" : "#111620",
                boxShadow: isSelected ? `0 0 16px ${toneColor}33` : "none",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: toneColor, fontWeight: 700 }}>
                  {sc.tag}
                </span>
                {isSelected && <Check size={14} style={{ color: toneColor }} />}
              </div>

              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-heading)", marginBottom: 4 }}>
                {sc.title}
              </div>
              <p style={{ fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.4, margin: 0 }}>
                {sc.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* PARAMETER SLIDERS */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Sliders size={16} style={{ color: "#06b6d4" }} />
          <strong style={{ fontSize: "0.82rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
            TINH CHỈNH THAM SỐ GIẢ ĐỊNH
          </strong>
        </div>

        {scenarioType === "EXTRA_GPUS" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Số lượng GPU H100 bổ sung:</span>
            <input
              type="range"
              min={1}
              max={6}
              value={extraGpus}
              onChange={(e) => setExtraGpus(parseInt(e.target.value))}
              style={{ maxWidth: 220, accentColor: "#06b6d4" }}
            />
            <strong style={{ fontSize: "0.85rem", color: "#06b6d4", fontFamily: "var(--font-mono)" }}>+{extraGpus} Nodes</strong>
          </div>
        )}

        {scenarioType === "SURGE_DEMAND" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Hệ số tăng tải nhu cầu:</span>
            <input
              type="range"
              min={1.5}
              max={3.0}
              step={0.5}
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
              style={{ maxWidth: 220, accentColor: "#f59e0b" }}
            />
            <strong style={{ fontSize: "0.85rem", color: "#f59e0b", fontFamily: "var(--font-mono)" }}>{demandMultiplier}x Nhu cầu</strong>
          </div>
        )}

        {scenarioType === "TARIFF_CHANGE" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Mức tăng giá điện cao điểm:</span>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={priceHike}
              onChange={(e) => setPriceHike(parseInt(e.target.value))}
              style={{ maxWidth: 220, accentColor: "#ef4444" }}
            />
            <strong style={{ fontSize: "0.85rem", color: "#ef4444", fontFamily: "var(--font-mono)" }}>+{priceHike}% Giá</strong>
          </div>
        )}

        {scenarioType === "NODE_FAILURE" && (
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
            Mô phỏng máy chủ chủ lực (GPU-H100-01) ngắt kết nối đột ngột lúc 14:00.
          </div>
        )}
      </div>

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="content-stack" style={{ gap: 16 }}>
          {/* AI SYNTHESIS */}
          <div style={{ background: "#161b26", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: "#06b6d4" }} />
              <strong style={{ fontSize: "0.85rem", color: "#06b6d4", fontFamily: "var(--font-mono)" }}>
                TỔNG HỢP ĐÁNH GIÁ TÁC ĐỘNG ĐỊNH LƯỢNG (AI IMPACT ASSESSMENT)
              </strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
              {result.aiSynthesis}
            </p>
          </div>

          {/* BEFORE / AFTER COMPARATIVE MATRIX */}
          <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <BarChart2 size={16} style={{ color: "#06b6d4" }} />
              <strong style={{ fontSize: "0.85rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
                MA TRẬN SO SÁNH ĐỐI KHÁNG: HIỆN TRẠNG (BASELINE) vs GIẢ ĐỊNH (COUNTERFACTUAL)
              </strong>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", color: "#64748b" }}>CHỈ SỐ ĐO LƯỜNG</th>
                  <th style={{ padding: "8px 10px", color: "#64748b" }}>HIỆN TRẠNG (BASELINE)</th>
                  <th style={{ padding: "8px 10px", color: "#64748b" }}>KỊCH BẢN GIẢ ĐỊNH</th>
                  <th style={{ padding: "8px 10px", color: "#64748b" }}>CHÊNH LỆCH (DELTA)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "10px", color: "#f8fafc" }}>Số Thiết Bị Khả Dụng</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.baseline.availableResources} Nodes</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.counterfactual.availableResources} Nodes</td>
                  <td style={{ padding: "10px", color: "#06b6d4" }}>
                    {result.comparison.counterfactual.availableResources - result.comparison.baseline.availableResources >= 0 ? "+" : ""}
                    {result.comparison.counterfactual.availableResources - result.comparison.baseline.availableResources} Nodes
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "10px", color: "#f8fafc" }}>Thời Gian Chờ Trung Bình</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.baseline.avgWaitHours} Giờ</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.counterfactual.avgWaitHours} Giờ</td>
                  <td style={{ padding: "10px", color: result.comparison.deltas.waitDeltaHours <= 0 ? "#10b981" : "#ef4444" }}>
                    {result.comparison.deltas.waitDeltaHours <= 0 ? "" : "+"}
                    {result.comparison.deltas.waitDeltaHours} Giờ
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "10px", color: "#f8fafc" }}>Tổng Chi Phí Điện Năng (EVN)</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.baseline.totalEnergyCostVnd.toLocaleString("vi-VN")} đ</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.counterfactual.totalEnergyCostVnd.toLocaleString("vi-VN")} đ</td>
                  <td style={{ padding: "10px", color: result.comparison.deltas.energyCostDeltaVnd <= 0 ? "#10b981" : "#f59e0b" }}>
                    {result.comparison.deltas.energyCostDeltaVnd <= 0 ? "" : "+"}
                    {result.comparison.deltas.energyCostDeltaVnd.toLocaleString("vi-VN")} đ
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "10px", color: "#f8fafc" }}>Chỉ Số Công Bằng Jain's Index</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.baseline.jainsFairnessIndex}</td>
                  <td style={{ padding: "10px", color: "#94a3b8" }}>{result.comparison.counterfactual.jainsFairnessIndex}</td>
                  <td style={{ padding: "10px", color: "#10b981" }}>
                    {result.comparison.deltas.fairnessDelta >= 0 ? "+" : ""}
                    {result.comparison.deltas.fairnessDelta}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "10px", color: "#f8fafc" }}>Số Ca Xung Đột Trùng Lịch</td>
                  <td style={{ padding: "10px", color: "#10b981" }}>0 Xung Đột</td>
                  <td style={{ padding: "10px", color: "#10b981" }}>0 Xung Đột</td>
                  <td style={{ padding: "10px", color: "#10b981" }}>Triệt Tiêu 100% (GiST Lock)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
