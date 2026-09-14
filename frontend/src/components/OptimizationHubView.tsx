import React, { useState, useEffect } from "react";
import {
  Award,
  Leaf,
  ShieldAlert,
  Calculator,
  RefreshCw,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  Server,
  TrendingDown,
  Wrench,
  Clock,
  Check
} from "lucide-react";
import { apiRequest } from "../api.js";

export const OptimizationHubView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"priority" | "estimator" | "predictive">("priority");

  // Tab 1: Priority Score State
  const [priorityInputs, setPriorityInputs] = useState({
    userRole: "phd_researcher",
    projectUrgency: "paper_deadline",
    noShowRate: 0.05,
    recentUsageHours: 12
  });
  const [priorityResult, setPriorityResult] = useState<any>({
    priorityScore: 88.5,
    reputationScore: 95,
    reputationMultiplier: 1.15,
    basePriority: 76.9,
    factors: {
      roleWeight: 40,
      urgencyWeight: 35,
      quotaBalanceScore: 13.5
    }
  });

  // Tab 2: Green AI Estimator State
  const [modelType, setModelType] = useState<string>("LLM_FINETUNE");
  const [durationHours, setDurationHours] = useState<number>(8);
  const [gpuCount, setGpuCount] = useState<number>(4);

  // Computed Green AI metrics
  const kwhEstimated = +(gpuCount * 0.55 * durationHours * 1.12).toFixed(2);
  const co2DaytimeKg = +(kwhEstimated * 0.72).toFixed(2);
  const co2NightKg = +(kwhEstimated * 0.38).toFixed(2);
  const co2SavingsKg = +(co2DaytimeKg - co2NightKg).toFixed(2);
  const costDaytimeVnd = Math.round(kwhEstimated * 1800);
  const costNightVnd = Math.round(kwhEstimated * 1100);
  const costSavingsVnd = costDaytimeVnd - costNightVnd;

  // Tab 3: Predictive Maintenance State
  const PREDICTIVE_REPORTS = [
    {
      nodeCode: "GPU-NODE-01",
      name: "NVIDIA DGX A100 SuperPOD",
      type: "GPU Server",
      healthIndex: 96,
      rulDays: 340,
      failureProbability: 0.03,
      status: "OPTIMAL",
      metrics: { temp: "58.2°C", fanSpeed: "45%", pcieErrors: 0 },
      recommendation: "Không phát hiện lỗi phần cứng. Tình trạng tản nhiệt buồng máy hoàn hảo."
    },
    {
      nodeCode: "GPU-H100-02",
      name: "NVIDIA DGX H100 Node 02",
      type: "GPU Server",
      healthIndex: 92,
      rulDays: 285,
      failureProbability: 0.06,
      status: "OPTIMAL",
      metrics: { temp: "63.5°C", fanSpeed: "62%", pcieErrors: 0 },
      recommendation: "Hiệu năng ổn định. Dự kiến bảo trì định kỳ sau 6 tháng."
    },
    {
      nodeCode: "UAV-MATRICE-300",
      name: "DJI Matrice 300 RTK Drone",
      type: "Aerial Robotics",
      healthIndex: 98,
      rulDays: 410,
      failureProbability: 0.01,
      status: "OPTIMAL",
      metrics: { temp: "28.5°C", batteryCycles: 42, motorImbalance: "0.2%" },
      recommendation: "Đã kiểm tra động cơ và pin RTK. Sẵn sàng cho nhiệm vụ bay tự hành."
    },
    {
      nodeCode: "RPI-KIT-05",
      name: "Raspberry Pi 5 Edge AI Kit",
      type: "Edge Microcontroller",
      healthIndex: 94,
      rulDays: 520,
      failureProbability: 0.02,
      status: "OPTIMAL",
      metrics: { temp: "41.4°C", sdCardWear: "8%", cpuThrottling: 0 },
      recommendation: "Bộ nhớ eMMC an toàn, không có hiện tượng suy giảm hiệu năng ghi đọc."
    }
  ];

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* 1. Header Command Bar with Segmented 3-Tab Bar */}
      <div className="card p-4 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="led-pulse led-pulse-ai" />
            <h2 className="text-base font-bold text-white tracking-wide">
              TRUNG TÂM THUẬT TOÁN, GREEN AI & DỰ ĐOÁN HỎNG HÓC (OPTIMIZATION HUB)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Điều phối thông minh: Tính điểm ưu tiên động, ước lượng phát thải Carbon-Aware và giám sát sức khỏe phần cứng
          </p>
        </div>

        {/* 3-Mode Segmented Tab Bar */}
        <div className="segmented-control-2026">
          <button
            type="button"
            className={`segmented-btn-2026 ${activeSubTab === "priority" ? "is-active" : ""}`}
            onClick={() => setActiveSubTab("priority")}
          >
            <Zap size={13} className="inline mr-1.5 text-amber-400" />
            Thuật Toán Ưu Tiên & Preemption
          </button>
          <button
            type="button"
            className={`segmented-btn-2026 ${activeSubTab === "estimator" ? "is-active" : ""}`}
            onClick={() => setActiveSubTab("estimator")}
          >
            <Leaf size={13} className="inline mr-1.5 text-emerald-400" />
            Green AI Estimator
          </button>
          <button
            type="button"
            className={`segmented-btn-2026 ${activeSubTab === "predictive" ? "is-active" : ""}`}
            onClick={() => setActiveSubTab("predictive")}
          >
            <Wrench size={13} className="inline mr-1.5 text-cyan-400" />
            Dự Đoán Hỏng Hóc Thiết Bị
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: THUẬT TOÁN ƯU TIÊN & PREEMPTION (MÀN 23) */}
      {activeSubTab === "priority" && (
        <div className="flex flex-col gap-5">
          <div className="optimization-subtab-grid">
            {/* Left Column: Priority Input Parameters (380px) */}
            <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider pb-2 border-b border-white/10">
                THAM SỐ TÍNH ĐIỂM ƯU TIÊN ĐỘNG (DYNAMIC PRIORITY FORMULA)
              </span>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-slate-400">Vai Trò Người Dùng (User Role):</label>
                <select
                  value={priorityInputs.userRole}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, userRole: e.target.value })}
                  className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
                >
                  <option value="lead_researcher">Chủ Nhiệm Đề Tài / Giảng Viên (40đ)</option>
                  <option value="phd_researcher">Nghiên Cứu Sinh Tiến Sĩ (30đ)</option>
                  <option value="master_student">Học Viên Cao Học (20đ)</option>
                  <option value="undergrad_thesis">Sinh Viên Làm ĐATN (15đ)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-slate-400">Tính Cấp Bách Dự Án (Urgency):</label>
                <select
                  value={priorityInputs.projectUrgency}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, projectUrgency: e.target.value })}
                  className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
                >
                  <option value="paper_deadline">Deadline Nộp Bài Báo Q1/Q2 (35đ)</option>
                  <option value="thesis_defense">Bảo Vệ Đồ Án Tốt Nghiệp (25đ)</option>
                  <option value="coursework">Bài Tập Lớn Môn Học (15đ)</option>
                  <option value="exploratory">Nghiên Cứu Thử Nghiệm (10đ)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Tỷ Lệ Vắng Mặt (No-Show Penalty):</span>
                  <strong className="text-amber-300">{(priorityInputs.noShowRate * 100).toFixed(0)}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.3}
                  step={0.01}
                  value={priorityInputs.noShowRate}
                  onChange={(e) => setPriorityInputs({ ...priorityInputs, noShowRate: parseFloat(e.target.value) })}
                  className="range-slider-wait h-2 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 bg-black/40 border border-white/5 rounded text-[11px] font-mono text-slate-400 leading-relaxed">
                Công thức: <strong>Priority = BaseScore × ReputationMultiplier + QuotaFairnessBonus</strong>
              </div>
            </div>

            {/* Right Column: Score Breakdown & Preemption */}
            <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-amber-400/30 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <span className="font-mono text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={15} />
                    <span>KẾT QUẢ TÍNH ĐIỂM & ĐỀ XUẤT PREEMPTION BUMP</span>
                  </span>
                  <span className="font-mono text-xs text-emerald-400">
                    Reputation: {priorityResult.reputationScore}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">ĐIỂM TỔNG HỢP:</span>
                    <strong className="font-mono text-2xl text-amber-300 mt-1 block">
                      {priorityResult.priorityScore}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">Thang điểm 100</span>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">HỆ SỐ UY TÍN:</span>
                    <strong className="font-mono text-xl text-cyan-300 mt-1 block">
                      {priorityResult.reputationMultiplier}x
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">No-show thấp</span>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">QUOTA BALANCE:</span>
                    <strong className="font-mono text-xl text-emerald-400 mt-1 block">
                      +{priorityResult.factors.quotaBalanceScore}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">Chưa vượt hạn ngạch</span>
                  </div>
                </div>

                {/* Preemption Proposal Box */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span>ĐỀ XUẤT PREEMPTION (CƠ CHẾ NHƯỜNG CHỖ CÔNG BẰNG)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed m-0">
                    Với điểm ưu tiên <strong>{priorityResult.priorityScore}</strong> (Vượt ngưỡng 80đ), yêu cầu này có quyền kích hoạt Preemption đối với các job học tập cá nhân đang chạy nền trên <strong>NVIDIA H100 Node 01</strong>. Tác vụ bị dời sẽ tự động được xếp vào ca đêm Giờ Xanh và cấp thêm <strong>+10 GPU-hours</strong> đền bù.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Trạng thái: <strong>SẴN SÀNG PREEMPTION</strong></span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  <span>SLA Guarantee 99.8%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GREEN AI ESTIMATOR (MÀN 24) */}
      {activeSubTab === "estimator" && (
        <div className="flex flex-col gap-5">
          {/* Top Parameters & Emission Metrics */}
          <div className="optimization-subtab-grid">
            {/* Left Parameters */}
            <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
              <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider pb-2 border-b border-white/10 flex items-center gap-2">
                <Leaf size={15} />
                <span>ĐẶC TẢ TÁC VỤ HUẤN LUYỆN AI (WORKLOAD SPECS)</span>
              </span>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-slate-400">Loại Mô Hình Huấn Luyện (Model Architecture):</label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
                >
                  <option value="LLM_FINETUNE">Fine-tuning Llama-3-70B / DeepSeek (4x H100)</option>
                  <option value="DIFFUSION_3D">Diffusion 3D Generative Vision (2x H100)</option>
                  <option value="CV_YOLO">Computer Vision YOLOV11 (1x L40S)</option>
                  <option value="EDGE_RL">Reinforcement Learning Robotics (Jetson AGX)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Thời Lượng Huấn Luyện:</span>
                  <strong className="text-cyan-300">{durationHours} GIỜ</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={48}
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
                  className="range-slider-wait h-2 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Số Lượng GPU Song Song:</span>
                  <strong className="text-amber-300">{gpuCount} GPUs</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={gpuCount}
                  onChange={(e) => setGpuCount(parseInt(e.target.value, 10))}
                  className="range-slider-energy h-2 bg-white/10 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Right Emission Outputs */}
            <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-emerald-500/30 rounded-xl flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider pb-2 border-b border-white/10 block mb-4">
                  DỰ TOÁN ĐIỆN NĂNG & PHÁT THẢI CARBON TƯƠNG ĐƯƠNG
                </span>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">ĐIỆN NĂNG TIÊU THỤ:</span>
                    <strong className="font-mono text-2xl text-amber-300 mt-1 block">
                      {kwhEstimated}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">kWh (PUE 1.12)</span>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">PHÁT THẢI BAN NGÀY:</span>
                    <strong className="font-mono text-xl text-rose-400 mt-1 block">
                      {co2DaytimeKg} kg
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">0.72 kgCO2/kWh</span>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/10 rounded text-center">
                    <span className="font-mono text-[10px] text-slate-400 block">PHÁT THẢI CA ĐÊM:</span>
                    <strong className="font-mono text-xl text-emerald-400 mt-1 block">
                      {co2NightKg} kg
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">0.38 kgCO2/kWh</span>
                  </div>
                </div>

                {/* Carbon-Aware Recommendation Banner */}
                <div className="carbon-aware-banner-2026">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
                    <Leaf size={15} />
                    <span>GỢI Ý LỊCH TRÌNH CARBON-AWARE (DỜI SANG CA ĐÊM 22:00 — 06:00)</span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed m-0 font-mono">
                    Bằng cách chuyển tác vụ này sang ca đêm, bạn sẽ tiết kiệm được <strong>{costSavingsVnd.toLocaleString()} VNĐ</strong> tiền điện (Giảm 45%) và cắt giảm <strong>-{co2SavingsKg} kgCO2</strong> khí thải vào môi trường.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Tiêu chuẩn: <strong>Green Grid Standard 2026</strong></span>
                <span className="text-emerald-400 font-bold">Giảm 47% phát thải ròng</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DỰ ĐOÁN HỎNG HÓC THIẾT BỊ (MÀN 25) */}
      {activeSubTab === "predictive" && (
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div>
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block">
                BẢNG PHÂN TÍCH SỨC KHỎE DỰ ĐOÁN & VÒNG ĐỜI HỮU ÍCH (PREDICTIVE HEALTH TABLE)
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Mô hình Machine Learning LSTM dự báo RUL (Remaining Useful Life) dựa trên chuỗi thời gian nhiệt độ, rung động và điện áp
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded border border-emerald-500/30">
              <ShieldAlert size={14} />
              <span>TẤT CẢ CÁC NODE AN TOÀN (100% HEALTHY)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="delta-impact-table-2026">
              <thead>
                <tr>
                  <th>Mã Node & Tên Thiết Bị</th>
                  <th>Loại Thiết Bị</th>
                  <th>Health Index</th>
                  <th>RUL (Thời Gian Hữu Ích)</th>
                  <th>Xác Suất Lỗi</th>
                  <th>Trạng Thái</th>
                  <th>Khuyến Nghị Bảo Trì</th>
                </tr>
              </thead>
              <tbody>
                {PREDICTIVE_REPORTS.map((node) => (
                  <tr key={node.nodeCode}>
                    <td>
                      <div className="font-mono text-xs font-bold text-white">{node.nodeCode}</div>
                      <div className="text-[11.5px] text-slate-400">{node.name}</div>
                    </td>
                    <td className="font-mono text-xs text-slate-300">{node.type}</td>
                    <td>
                      <div className="font-mono text-sm font-bold text-emerald-400">{node.healthIndex} / 100</div>
                      <div className="w-24 h-1.5 bg-white/10 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded" style={{ width: `${node.healthIndex}%` }} />
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">
                        {node.rulDays} ngày
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {(node.failureProbability * 100).toFixed(1)}%
                    </td>
                    <td>
                      <span className="delta-tag delta-positive">
                        <Check size={12} />
                        <span>{node.status}</span>
                      </span>
                    </td>
                    <td className="text-xs text-slate-300 max-w-xs">
                      {node.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
