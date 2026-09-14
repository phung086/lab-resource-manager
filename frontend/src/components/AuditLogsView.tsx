import React, { useState } from "react";
import {
  ClipboardCheck,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  Download,
  Hash,
  Terminal,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { EmptyStateCard } from "./EmptyStateCard.tsx";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actionTag: "AUTH_LOGIN" | "PREEMPT_JOB" | "UPDATE_POLICY" | "ALLOCATE_NODE" | "RESOLVE_CONFLICT" | "QR_CHECKIN";
  targetResource: string;
  clientIp: string;
  sha256Hash: string;
  details: string;
}

const SAMPLE_LOGS: AuditLogEntry[] = [
  {
    id: "LOG-2026-9041",
    timestamp: "2026-09-09T13:15:22+07:00",
    actorName: "GS.TS Nguyễn Văn A",
    actorEmail: "admin@ailab.edu.vn",
    actorRole: "Quản trị viên",
    actionTag: "UPDATE_POLICY",
    targetResource: "LAB-POLICY-CORE",
    clientIp: "10.244.12.89",
    sha256Hash: "e3b0c442...98b0f1a5",
    details: "Điều chỉnh thời gian ân hạn check-in thành 15 phút, bật preemption tự động."
  },
  {
    id: "LOG-2026-9040",
    timestamp: "2026-09-09T13:02:18+07:00",
    actorName: "Hệ Thống Tự Động NSGA-II",
    actorEmail: "scheduler.daemon@ailab.edu.vn",
    actorRole: "AI Orchestrator",
    actionTag: "PREEMPT_JOB",
    targetResource: "GPU-NODE-01 (DGX A100)",
    clientIp: "127.0.0.1 (Localhost)",
    sha256Hash: "a4f89d12...73c2e891",
    details: "Kích hoạt Preemption nhường chỗ cho Paper Q1 NCS. Trần Tiến Dũng, bù +4h ca đêm."
  },
  {
    id: "LOG-2026-9039",
    timestamp: "2026-09-09T12:48:05+07:00",
    actorName: "ThS. Lê Hoàng Yến",
    actorEmail: "hoangyen.msc@ailab.edu.vn",
    actorRole: "Học viên Cao học",
    actionTag: "QR_CHECKIN",
    targetResource: "UAV-MATRICE-300",
    clientIp: "10.244.15.112",
    sha256Hash: "6f9b21a8...3d5e7094",
    details: "Xác thực mã VietQR Check-in thành công tại trạm sạc Dock UAV-BAY-02."
  },
  {
    id: "LOG-2026-9038",
    timestamp: "2026-09-09T11:30:00+07:00",
    actorName: "SV. Nguyễn Mai Phương",
    actorEmail: "maiphuong.k65@ailab.edu.vn",
    actorRole: "Sinh viên ĐATN",
    actionTag: "ALLOCATE_NODE",
    targetResource: "L40S-WORKSTATION-01",
    clientIp: "10.244.14.77",
    sha256Hash: "8c12fa49...120efaa6",
    details: "Đăng ký thành công slot 6 giờ huấn luyện YOLOv11 khung giờ xanh EVN."
  },
  {
    id: "LOG-2026-9037",
    timestamp: "2026-09-09T08:00:12+07:00",
    actorName: "PGS.TS Vũ Đình Huy",
    actorEmail: "dinhhuy@ailab.edu.vn",
    actorRole: "Giảng viên",
    actionTag: "AUTH_LOGIN",
    targetResource: "PORTAL-AUTH",
    clientIp: "10.244.10.45",
    sha256Hash: "2b61408a...45bc7819",
    details: "Đăng nhập xác thực 2 lớp qua tài khoản trường Đại học."
  }
];

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(SAMPLE_LOGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  function handleExportCsv() {
    const headers = "ID,Timestamp ISO 2026,Actor,Email,Vai Trò,Hành Động,Tài Nguyên,IP,SHA-256 Hash,Chi Tiết\n";
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.actorName}","${l.actorEmail}","${l.actorRole}","${l.actionTag}","${l.targetResource}","${l.clientIp}","${l.sha256Hash}","${l.details}"`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Audit_Logs_2026_09.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleGenerateDemo() {
    setLogs(SAMPLE_LOGS);
    setSearchTerm("");
    setActionFilter("ALL");
  }

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetResource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "ALL" || l.actionTag === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionTagStyles = {
    AUTH_LOGIN: "bg-slate-800 text-slate-300 border-slate-600",
    PREEMPT_JOB: "bg-amber-950/80 text-amber-300 border-amber-500/40",
    UPDATE_POLICY: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
    ALLOCATE_NODE: "bg-blue-950/80 text-blue-300 border-blue-500/40",
    RESOLVE_CONFLICT: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
    QR_CHECKIN: "bg-violet-950/80 text-violet-300 border-violet-500/40"
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              IMMUTABLE AUDIT PROVENANCE 2026
            </span>
            <span className="led-pulse led-pulse-safe" />
            <span className="font-mono text-[11px] text-slate-400">SHA-256 TAMPER-PROOF TRAIL</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Sổ Nhật Ký Kiểm Toán & Truy Vết Hành Động
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bảo đảm tính bất biến, minh bạch và tuân thủ chuẩn ISO/IEC 27001 cho toàn bộ thao tác trong phòng lab
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="font-mono text-xs font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 px-4 py-2 rounded-lg border border-cyan-500/40 flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
        >
          <Download size={14} />
          <span>📥 XUẤT NHẬT KÝ KIỂM TOÁN CSV</span>
        </button>
      </div>

      {/* 2. Audit Table Controls */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-cyan-400" />
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
              BẢNG GHI NHẬN THỜI GIAN THỰC (REAL-TIME AUDIT LOGS)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm actor / hash / IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg pl-7 pr-3 py-1.5 w-52"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg px-2.5 py-1.5"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="AUTH_LOGIN">AUTH_LOGIN</option>
              <option value="PREEMPT_JOB">PREEMPT_JOB</option>
              <option value="UPDATE_POLICY">UPDATE_POLICY</option>
              <option value="ALLOCATE_NODE">ALLOCATE_NODE</option>
              <option value="QR_CHECKIN">QR_CHECKIN</option>
            </select>
          </div>
        </div>

        {/* Logs Table or Empty State */}
        {filteredLogs.length === 0 ? (
          <EmptyStateCard
            icon={ClipboardCheck}
            title="Không tìm thấy bản ghi kiểm toán phù hợp"
            description="Thử xóa bộ lọc tìm kiếm hoặc bấm nút bên dưới để khôi phục danh sách bản ghi kiểm toán mẫu."
            actionLabel="⚡ Khôi Phục Nhật Ký Mẫu"
            onAction={handleGenerateDemo}
            variant="info"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[11px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Thời Gian (ISO 2026)</th>
                  <th className="py-2.5 px-3">Người Thực Hiện (Actor)</th>
                  <th className="py-2.5 px-3">Hành Động</th>
                  <th className="py-2.5 px-3">Tài Nguyên / Đối Tượng</th>
                  <th className="py-2.5 px-3">Client IP</th>
                  <th className="py-2.5 px-3">SHA-256 Hash</th>
                  <th className="py-2.5 px-3">Chi Tiết Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      <strong className="text-white block">{log.actorName}</strong>
                      <span className="font-mono text-[10.5px] text-slate-500">{log.actorEmail}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded border inline-block ${
                          actionTagStyles[log.actionTag] || "bg-black/50 text-slate-300"
                        }`}
                      >
                        {log.actionTag}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">{log.targetResource}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{log.clientIp}</td>
                    <td className="py-3 px-3 font-mono text-amber-300 text-[11px] flex items-center gap-1">
                      <Hash size={11} className="text-amber-400 shrink-0" />
                      <span>{log.sha256Hash}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11.5px] max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
