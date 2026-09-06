import React, { useState, useEffect, useCallback } from "react";
import {
  Play, Pause, RotateCcw, AlertTriangle, Thermometer,
  Zap, HeartPulse, Clock, ChevronRight, Loader2, WifiOff, Info
} from "lucide-react";
import { apiRequest } from "../api.js";

/**
 * DecisionTimelineReplay — Nhật ký tái hiện trạng thái thiết bị (Digital Twin Replay)
 *
 * Dữ liệu: GET /simulation/digital-twin/replay?hours=N
 * Mỗi frame = snapshot telemetry mỗi 15 phút gồm:
 *   timestamp, timeFormatted, temperatureC, powerWatts,
 *   healthIndex, dataSource, status
 */

function getStatusTone(status) {
  if (status === "broken") return "var(--red)";
  if (status === "in_use") return "var(--amber)";
  return "var(--green)";
}

function getHealthTone(healthIndex) {
  if (healthIndex < 40) return "var(--red)";
  if (healthIndex < 70) return "var(--amber)";
  return "var(--green)";
}

function getStatusLabel(status) {
  if (status === "broken") return "Quá nhiệt / Dừng";
  if (status === "in_use") return "Đang tải cao";
  return "Khả dụng";
}

function getHealthLabel(healthIndex) {
  if (healthIndex >= 90) return "Xuất sắc";
  if (healthIndex >= 75) return "Khỏe mạnh";
  if (healthIndex >= 50) return "Suy giảm";
  if (healthIndex >= 25) return "Cảnh báo";
  return "Nguy hiểm";
}

export function DecisionTimelineReplay() {
  const [frames, setFrames] = useState([]);
  const [resource, setResource] = useState(null);
  const [timeRange, setTimeRange] = useState(null);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoursParam, setHoursParam] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchReplay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/simulation/digital-twin/replay?hours=${hoursParam}`);
      if (!data.success || !data.frames?.length) {
        setFrames([]);
        setResource(data.resource || null);
        setTimeRange(data.timeRange || null);
        return;
      }
      setFrames(data.frames);
      setResource(data.resource);
      setTimeRange(data.timeRange);
      setActiveFrameIdx(data.frames.length - 1);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu replay.");
      setFrames([]);
    } finally {
      setLoading(false);
    }
  }, [hoursParam]);

  useEffect(() => {
    fetchReplay();
  }, [fetchReplay]);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const timer = setInterval(() => {
      setActiveFrameIdx((prev) => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  const activeFrame = frames[activeFrameIdx] || null;

  // Pick a subset of frames for the visible timeline (max ~30 to keep UI clean)
  const maxVisible = 30;
  const step = frames.length > maxVisible ? Math.ceil(frames.length / maxVisible) : 1;
  const visibleFrames = frames.filter((_, i) => i % step === 0 || i === frames.length - 1 || i === activeFrameIdx);

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="content-stack" style={{ gap: 20 }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "48px 22px", textAlign: "center"
        }}>
          <Loader2 size={28} style={{ color: "var(--amber)", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: "0.9rem" }}>
            Đang tải dữ liệu replay từ Digital Twin Engine…
          </p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="content-stack" style={{ gap: 20 }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "32px 22px", display: "flex",
          alignItems: "flex-start", gap: 12
        }}>
          <WifiOff size={20} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem", display: "block", marginBottom: 4 }}>
              Mất kết nối — không có dữ liệu replay
            </strong>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={fetchReplay}
              style={{
                marginTop: 12, background: "none", border: "1px solid var(--line)",
                color: "var(--amber)", padding: "6px 14px", borderRadius: 6,
                cursor: "pointer", fontSize: "0.8rem", fontFamily: "var(--font-mono)"
              }}
            >
              <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (frames.length === 0) {
    return (
      <div className="content-stack" style={{ gap: 20 }}>
        <div style={{
          background: "var(--surface)", border: "2px dashed var(--line)",
          borderRadius: 8, padding: "40px 22px", textAlign: "center"
        }}>
          <Clock size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "1rem", marginBottom: 6 }}>
            Chưa có dữ liệu replay
          </strong>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
            Hệ thống Digital Twin chưa ghi nhận frame nào trong {hoursParam} giờ qua
            {resource ? ` cho thiết bị ${resource.name} (${resource.code})` : ""}.
            Hãy đảm bảo backend đang chạy và có thiết bị trong cơ sở dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  // --- DATA STATE ---
  // Compute summary stats from real frames
  const temps = frames.map((f) => f.temperatureC);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgTemp = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
  const criticalCount = frames.filter((f) => f.status === "broken").length;
  const inUseCount = frames.filter((f) => f.status === "in_use").length;

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "18px 22px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)",
                padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)"
              }}>
                {activeFrame?.dataSource || "SIMULATED"}
              </span>
              {resource && (
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {resource.code} — {resource.name}
                </span>
              )}
            </div>
            <h2 style={{
              fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-heading)", margin: "6px 0 2px 0"
            }}>
              Nhật Ký Tái Hiện Trạng Thái Thiết Bị (Digital Twin Replay)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              {timeRange
                ? `${frames.length} snapshot mỗi 15 phút — từ ${new Date(timeRange.start).toLocaleString("vi-VN")} đến ${new Date(timeRange.end).toLocaleString("vi-VN")}`
                : `${frames.length} frame đã ghi nhận`
              }
            </p>
          </div>

          {/* Playback controls + time window selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={hoursParam}
              onChange={(e) => { setHoursParam(Number(e.target.value)); }}
              style={{
                background: "var(--surface-strong)", color: "var(--text-primary)",
                border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px",
                fontSize: "0.8rem", fontFamily: "var(--font-mono)", cursor: "pointer"
              }}
            >
              <option value={4}>4 giờ</option>
              <option value={8}>8 giờ</option>
              <option value={12}>12 giờ</option>
              <option value={24}>24 giờ</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (activeFrameIdx >= frames.length - 1) setActiveFrameIdx(0);
                setIsPlaying(!isPlaying);
              }}
              style={{
                background: isPlaying
                  ? "color-mix(in srgb, var(--amber) 15%, transparent)"
                  : "color-mix(in srgb, var(--green) 15%, transparent)",
                border: `1px solid ${isPlaying ? "var(--amber)" : "var(--green)"}`,
                color: isPlaying ? "var(--amber)" : "var(--green)",
                borderRadius: 6, padding: "6px 14px", cursor: "pointer",
                fontSize: "0.8rem", fontFamily: "var(--font-mono)",
                display: "flex", alignItems: "center", gap: 6
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Tạm dừng" : "Phát lại"}
            </button>
            <button
              type="button"
              onClick={() => { setActiveFrameIdx(0); setIsPlaying(false); }}
              style={{
                background: "none", border: "1px solid var(--line)",
                color: "var(--text-secondary)", borderRadius: 6,
                padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem"
              }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Summary stats row — computed from real frame data */}
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { label: "Frame", value: `${activeFrameIdx + 1} / ${frames.length}`, tone: "var(--text-primary)" },
            { label: "Nhiệt TB", value: `${avgTemp}°C`, tone: avgTemp > 75 ? "var(--red)" : "var(--text-primary)" },
            { label: "Nhiệt Max", value: `${maxTemp.toFixed(1)}°C`, tone: maxTemp > 85 ? "var(--red)" : "var(--amber)" },
            { label: "Sự cố nhiệt", value: `${criticalCount}`, tone: criticalCount > 0 ? "var(--red)" : "var(--green)" },
            { label: "Tải cao", value: `${inUseCount}`, tone: "var(--amber)" }
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--surface-strong)", border: "1px solid var(--line)",
              borderRadius: 6, padding: "8px 14px", minWidth: 90
            }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: stat.tone, fontFamily: "var(--font-mono)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* TIMELINE PROGRESSION */}
        <div style={{
          flex: 1, minWidth: 320, background: "var(--surface)",
          border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px",
          maxHeight: 600, overflowY: "auto"
        }}>
          <strong style={{
            fontSize: "0.95rem", color: "var(--text-primary)",
            fontFamily: "var(--font-heading)", display: "block", marginBottom: 18
          }}>
            TIẾN TRÌNH REPLAY ({visibleFrames.length} điểm hiển thị)
          </strong>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visibleFrames.map((frame, vIdx) => {
              const realIdx = frames.indexOf(frame);
              const isActive = realIdx === activeFrameIdx;
              const isPast = realIdx <= activeFrameIdx;
              const tone = getStatusTone(frame.status);

              return (
                <div
                  key={frame.timestamp}
                  onClick={() => { setActiveFrameIdx(realIdx); setIsPlaying(false); }}
                  style={{
                    display: "flex", gap: 16, cursor: "pointer", position: "relative",
                    opacity: isPast ? 1 : 0.4, transition: "all 0.2s ease"
                  }}
                >
                  {/* Vertical line */}
                  {vIdx < visibleFrames.length - 1 && (
                    <div style={{
                      position: "absolute", top: 28, left: 11, bottom: -4,
                      width: 2, background: isPast ? tone : "var(--line)"
                    }} />
                  )}

                  {/* Node circle */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 12, display: "grid",
                    placeItems: "center", flexShrink: 0,
                    background: isActive ? tone : "transparent",
                    border: `2px solid ${isPast ? tone : "var(--line-strong)"}`,
                    zIndex: 2, marginTop: 2
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: isActive ? "var(--bg)" : (isPast ? tone : "var(--line)")
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                        color: tone, fontWeight: 700
                      }}>
                        {frame.timeFormatted}
                      </span>
                      <span style={{
                        fontSize: "0.68rem", fontFamily: "var(--font-mono)",
                        padding: "1px 6px", borderRadius: 3,
                        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
                        color: tone, border: `1px solid color-mix(in srgb, ${tone} 25%, transparent)`
                      }}>
                        {getStatusLabel(frame.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>
                        <Thermometer size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {frame.temperatureC}°C
                      </span>
                      <span>
                        <Zap size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {frame.powerWatts}W
                      </span>
                      <span>
                        <HeartPulse size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        H={frame.healthIndex}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAILS PANEL */}
        <div style={{
          flex: 1, minWidth: 320, background: "var(--surface-strong)",
          border: "1px solid var(--line)", borderRadius: 8, padding: "24px 26px"
        }}>
          {activeFrame ? (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                borderBottom: "1px solid var(--line)", paddingBottom: 12
              }}>
                <span style={{
                  fontSize: "0.85rem", fontFamily: "var(--font-mono)",
                  color: getStatusTone(activeFrame.status), fontWeight: 700,
                  padding: "2px 8px", borderRadius: 4,
                  background: `color-mix(in srgb, ${getStatusTone(activeFrame.status)} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${getStatusTone(activeFrame.status)} 30%, transparent)`
                }}>
                  CHI TIẾT FRAME #{activeFrameIdx + 1}
                </span>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {activeFrame.timeFormatted}
                </span>
              </div>

              <strong style={{
                fontSize: "1.1rem", color: "var(--text-primary)",
                fontFamily: "var(--font-heading)", display: "block", marginBottom: 20
              }}>
                {getStatusLabel(activeFrame.status)} — {getHealthLabel(activeFrame.healthIndex)}
              </strong>

              <div style={{ display: "grid", gap: 12 }}>
                {/* Temperature */}
                <DetailCard
                  label="Nhiệt độ"
                  value={`${activeFrame.temperatureC}°C`}
                  tone={activeFrame.temperatureC >= 85 ? "var(--red)" : (activeFrame.temperatureC >= 72 ? "var(--amber)" : "var(--green)")}
                  note={activeFrame.temperatureC >= 85 ? "NGƯỠNG NGUY HIỂM ≥ 85°C" : (activeFrame.temperatureC >= 72 ? "Cảnh báo ≥ 72°C" : "Trong giới hạn an toàn")}
                />

                {/* Power */}
                <DetailCard
                  label="Công suất tiêu thụ"
                  value={`${activeFrame.powerWatts} W`}
                  tone={activeFrame.powerWatts >= 450 ? "var(--amber)" : "var(--green)"}
                  note={`Tải ${activeFrame.powerWatts >= 450 ? "cao" : "bình thường"}`}
                />

                {/* Health Index */}
                <DetailCard
                  label="Health Index (H)"
                  value={`${activeFrame.healthIndex} / 100`}
                  tone={getHealthTone(activeFrame.healthIndex)}
                  note={`Xếp hạng: ${getHealthLabel(activeFrame.healthIndex)}`}
                />

                {/* Health bar */}
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--line)",
                  borderRadius: 6, padding: "12px 14px"
                }}>
                  <span style={{
                    fontSize: "0.7rem", color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)", textTransform: "uppercase",
                    display: "block", marginBottom: 8
                  }}>
                    HEALTH BAR
                  </span>
                  <div style={{
                    height: 8, background: "var(--line)", borderRadius: 4,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%", width: `${activeFrame.healthIndex}%`,
                      background: getHealthTone(activeFrame.healthIndex),
                      borderRadius: 4, transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                {/* Status */}
                <DetailCard
                  label="Trạng thái vận hành"
                  value={getStatusLabel(activeFrame.status)}
                  tone={getStatusTone(activeFrame.status)}
                  note={`Mã trạng thái: ${activeFrame.status}`}
                />

                {/* Data Source */}
                <DetailCard
                  label="Nguồn dữ liệu"
                  value={activeFrame.dataSource}
                  tone="var(--text-primary)"
                  note={activeFrame.dataSource === "SIMULATED"
                    ? "Dữ liệu mô phỏng từ Digital Twin Engine (chưa có cảm biến vật lý)"
                    : "Dữ liệu từ cảm biến vật lý ESP32 qua MQTT"
                  }
                />

                {/* Timestamp */}
                <DetailCard
                  label="Thời điểm ghi nhận"
                  value={new Date(activeFrame.timestamp).toLocaleString("vi-VN")}
                  tone="var(--text-primary)"
                />
              </div>

              {/* Methodology note */}
              <div style={{
                marginTop: 24, padding: "12px 14px",
                background: "color-mix(in srgb, var(--amber) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
                borderRadius: 6, color: "var(--text-secondary)", fontSize: "0.78rem",
                display: "flex", alignItems: "flex-start", gap: 8
              }}>
                <Info size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: 2 }}>
                    Ghi chú phương pháp (ước tính)
                  </strong>
                  Health Index H được tính bằng hàm đa yếu tố: H = 0.35·H_thermal + 0.25·H_power + 0.25·H_vibration + 0.15·H_utilization.
                  Khi nguồn dữ liệu là SIMULATED, nhiệt độ và công suất được sinh từ mô hình
                  đường cong tải ngày/đêm (diurnal load curve), không phải số đo cảm biến thật.
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Chọn một frame trên timeline để xem chi tiết.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reusable detail card inside the right panel */
function DetailCard({ label, value, tone, note }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 6, padding: "12px 14px",
      borderLeft: `3px solid ${tone}`, display: "flex", flexDirection: "column"
    }}>
      <span style={{
        fontSize: "0.7rem", color: "var(--text-muted)",
        fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 4
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "1rem", color: tone, fontWeight: 700,
        fontFamily: "var(--font-mono)", wordBreak: "break-word"
      }}>
        {value}
      </span>
      {note && (
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
          {note}
        </span>
      )}
    </div>
  );
}
