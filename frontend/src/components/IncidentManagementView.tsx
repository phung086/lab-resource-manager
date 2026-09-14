import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Server
} from "lucide-react";
import { EmptyStateCard } from "./EmptyStateCard.tsx";

interface LabIncident {
  id: string;
  code: string;
  severity: "P1" | "P2" | "P3";
  title: string;
  description: string;
  resourceCode: string;
  resourceName: string;
  reportedBy: string;
  createdAt: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  resolutionNote?: string;
}

const INITIAL_INCIDENTS: LabIncident[] = [
  {
    id: "INC-2026-081",
    code: "P1-CRITICAL",
    severity: "P1",
    title: "Server Rack RACK-ZONE-01 Quá Nhiệt 82.5°C",
    description: "Cảm biến nhiệt độ buồng máy phát hiện luồng khí nóng vượt ngưỡng 80°C liên tục 12 phút. Đã kích hoạt hệ thống làm mát dự phòng.",
    resourceCode: "GPU-NODE-01",
    resourceName: "NVIDIA DGX A100 SuperPOD",
    reportedBy: "KSC. Đỗ Mạnh Hùng (On-Call)",
    createdAt: "09/09/2026 13:10",
    status: "OPEN"
  },
  {
    id: "INC-2026-080",
    severity: "P2",
    code: "P2-WARNING",
    title: "VRAM Memory Leak & Phân Mảnh Bộ Nhớ",
    description: "Job huấn luyện DeepSeek 70B bị crash out-of-memory do phân mảnh bộ nhớ VRAM trên cụm SXM5 Node 02.",
    resourceCode: "GPU-H100-02",
    resourceName: "NVIDIA DGX H100 SXM5",
    reportedBy: "NCS. Trần Tiến Dũng",
    createdAt: "09/09/2026 11:45",
    status: "IN_PROGRESS"
  },
  {
    id: "INC-2026-079",
    severity: "P3",
    code: "P3-NORMAL",
    title: "Lệch Cảm Biến Motor Drone UAV Matrice 300",
    description: "Độ chênh lệch vận tốc vòng quay motor số 3 vượt 0.8% trong quá trình bay thực nghiệm ngoài trời.",
    resourceCode: "UAV-MATRICE-300",
    resourceName: "DJI Matrice 300 RTK Dock",
    reportedBy: "ThS. Lê Hoàng Yến",
    createdAt: "08/09/2026 16:20",
    status: "RESOLVED",
    resolutionNote: "Đã cân chỉnh gyro và hiệu chuẩn lại trục ESC. Sẵn sàng bay."
  }
];

export const IncidentManagementView: React.FC = () => {
  const [incidents, setIncidents] = useState<LabIncident[]>(INITIAL_INCIDENTS);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newSeverity, setNewSeverity] = useState<"P1" | "P2" | "P3">("P2");
  const [newResource, setNewResource] = useState("GPU-NODE-01");
  const [newDesc, setNewDesc] = useState("");

  function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newInc: LabIncident = {
      id: `INC-2026-${Date.now().toString().slice(-3)}`,
      code: `${newSeverity}-${newSeverity === "P1" ? "CRITICAL" : newSeverity === "P2" ? "WARNING" : "NORMAL"}`,
      severity: newSeverity,
      title: newTitle.trim(),
      description: newDesc.trim(),
      resourceCode: newResource,
      resourceName: newResource.includes("GPU") ? "NVIDIA Compute Server" : "Drone & Robotics Kit",
      reportedBy: "GS.TS Nguyễn Văn A (Quản Trị Viên)",
      createdAt: "09/09/2026 13:25",
      status: "OPEN"
    };

    setIncidents([newInc, ...incidents]);
    setShowReportModal(false);
    setNewTitle("");
    setNewDesc("");
    setToastMessage(`⚡ Đã tiếp nhận báo cáo sự cố ${newInc.id}. Đội trực vận hành đã nhận thông báo!`);
    setTimeout(() => setToastMessage(""), 4000);
  }

  function handleResolveIncident(incidentId: string) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: "RESOLVED",
              resolutionNote: "Đã khắc phục lỗi kỹ thuật, kiểm thử phần cứng pass 100%."
            }
          : inc
      )
    );
    setToastMessage(`✅ Sự cố ${incidentId} đã được khắc phục thành công!`);
    setTimeout(() => setToastMessage(""), 3500);
  }

  function handleGenerateDemo() {
    setIncidents(INITIAL_INCIDENTS);
    setToastMessage("Đã tải lại danh sách sự cố mẫu phân cấp P1/P2/P3!");
    setTimeout(() => setToastMessage(""), 3000);
  }

  const filteredIncidents = incidents.filter((i) => {
    if (filter === "OPEN") return i.status !== "RESOLVED";
    if (filter === "RESOLVED") return i.status === "RESOLVED";
    return true;
  });

  const severityBadgeStyles = {
    P1: "bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse",
    P2: "bg-amber-950/80 text-amber-300 border-amber-500/50",
    P3: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
              INCIDENT & OUTAGE MANAGEMENT 2026
            </span>
            <span className="led-pulse led-pulse-danger" />
            <span className="font-mono text-[11px] text-slate-400">HARDWARE FAULT ISOLATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Quản Lý Sự Cố & Gián Đoạn Phần Cứng
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ghi nhận lỗi phần cứng, quá nhiệt buồng máy và theo dõi tiến độ khắc phục kỹ thuật
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReportModal(!showReportModal)}
            className="font-mono text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            <Plus size={14} />
            <span>BÁO CÁO SỰ CỐ MỚI</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Modal / Form */}
      {showReportModal && (
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-rose-500/30 rounded-xl flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-mono text-xs text-rose-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={15} />
              <span>GỬI PHIẾU BÁO CÁO SỰ CỐ PHẦN CỨNG</span>
            </span>
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Đóng
            </button>
          </div>

          <form onSubmit={handleCreateIncident} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-mono text-[11px] text-slate-400">Tiêu đề sự cố *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Cụm GPU Node 01 phát hiện quạt tản nhiệt quay dưới 20%..."
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Phân cấp mức độ (Severity) *</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
              >
                <option value="P1">P1 - Khẩn Cấp (Quá nhiệt &gt; 80°C / Mất điện)</option>
                <option value="P2">P2 - Cảnh Báo (Tràn VRAM / PCIe Error)</option>
                <option value="P3">P3 - Tiêu Chuẩn (Hiệu chuẩn / Nhắc bảo trì)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Thiết bị bị ảnh hưởng *</label>
              <select
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
              >
                <option value="GPU-NODE-01">GPU-NODE-01 (NVIDIA DGX A100)</option>
                <option value="GPU-H100-02">GPU-H100-02 (NVIDIA DGX H100)</option>
                <option value="UAV-MATRICE-300">UAV-MATRICE-300 (DJI RTK Drone)</option>
                <option value="RPI-KIT-05">RPI-KIT-05 (Raspberry Pi 5 Edge AI)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-mono text-[11px] text-slate-400">Mô tả hiện tượng và dữ liệu đo *</label>
              <textarea
                required
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ghi nhận cụ thể thông số lỗi, log telemetry hoặc hiện tượng vật lý..."
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-sans"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="font-mono text-xs px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="font-mono text-xs font-bold px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
              >
                Gửi Báo Cáo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "ALL"
                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Tất Cả ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPEN")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "OPEN"
                ? "bg-rose-500/15 border-rose-400 text-rose-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Đang Xử Lý ({incidents.filter((i) => i.status !== "RESOLVED").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESOLVED")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
              filter === "RESOLVED"
                ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Đã Khắc Phục ({incidents.filter((i) => i.status === "RESOLVED").length})
          </button>
        </div>

        <span className="font-mono text-xs text-slate-400">
          Trạng thái SLA: <strong className="text-emerald-400">99.8% OK</strong>
        </span>
      </div>

      {/* 3. Incidents List or Empty State */}
      {filteredIncidents.length === 0 ? (
        <EmptyStateCard
          icon={CheckCircle2}
          title="Không có sự cố gián đoạn nào (Zero Outage)"
          description="Toàn bộ cụm phần cứng phòng lab đang vận hành hoàn hảo không phát sinh cảnh báo gián đoạn."
          actionLabel="⚡ Tạo Vé Mô Phỏng Thử Nghiệm"
          onAction={handleGenerateDemo}
          variant="safe"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredIncidents.map((inc) => {
            const isResolved = inc.status === "RESOLVED";

            return (
              <div
                key={inc.id}
                className={`card p-5 bg-surface-card backdrop-blur-2xl border rounded-xl flex flex-col gap-3 transition-all ${
                  isResolved
                    ? "border-emerald-500/30 opacity-70"
                    : inc.severity === "P1"
                    ? "border-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                    : "border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border ${
                        severityBadgeStyles[inc.severity]
                      }`}
                    >
                      {inc.code}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide">{inc.title}</h3>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30 flex items-center gap-1">
                      <Server size={12} />
                      <span>{inc.resourceCode}</span>
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        isResolved
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                          : inc.status === "IN_PROGRESS"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          : "bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed m-0">
                  {inc.description}
                </p>

                {inc.resolutionNote && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span><strong>Biện pháp khắc phục:</strong> {inc.resolutionNote}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  <span>Báo cáo bởi: <strong className="text-slate-200">{inc.reportedBy}</strong> ({inc.createdAt})</span>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleResolveIncident(inc.id)}
                      className="font-mono text-xs font-bold text-obsidian bg-emerald-400 hover:bg-emerald-300 px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <Check size={13} />
                      <span>Đánh Dấu Giải Quyết</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
