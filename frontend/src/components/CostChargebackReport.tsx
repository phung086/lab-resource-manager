import React, { useState } from "react";
import {
  DollarSign,
  Download,
  Filter,
  Calendar,
  Zap,
  TrendingDown,
  Building,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  Leaf,
  CreditCard,
  Search
} from "lucide-react";

interface PaymentTransaction {
  id: string;
  department: string;
  resourceName: string;
  timeSlot: string;
  isGreenHours: boolean;
  amountVnd: number;
  originalAmountVnd: number;
  status: "PAID" | "PENDING" | "RECONCILED";
  paymentMethod: string;
  date: string;
}

const SAMPLE_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "TXN-2026-0901",
    department: "Bộ Môn Trí Tuệ Nhân Tạo & CV",
    resourceName: "NVIDIA DGX H100 Node 01",
    timeSlot: "22:00 — 06:00 (Giờ Xanh)",
    isGreenHours: true,
    amountVnd: 2640000,
    originalAmountVnd: 4800000,
    status: "RECONCILED",
    paymentMethod: "VietQR Auto-Debit",
    date: "08/09/2026 23:45"
  },
  {
    id: "TXN-2026-0902",
    department: "Khối Đồ Án Tốt Nghiệp AI",
    resourceName: "NVIDIA L40S Workstation 02",
    timeSlot: "08:00 — 16:00 (Tiêu Chuẩn)",
    isGreenHours: false,
    amountVnd: 1800000,
    originalAmountVnd: 1800000,
    status: "RECONCILED",
    paymentMethod: "VietQR Auto-Debit",
    date: "08/09/2026 17:15"
  },
  {
    id: "TXN-2026-0903",
    department: "Bộ Môn Robotics & Tự Hành",
    resourceName: "DJI Matrice 300 RTK Dock",
    timeSlot: "09:00 — 12:00 (Tiêu Chuẩn)",
    isGreenHours: false,
    amountVnd: 950000,
    originalAmountVnd: 950000,
    status: "RECONCILED",
    paymentMethod: "VietQR Auto-Debit",
    date: "09/09/2026 12:30"
  },
  {
    id: "TXN-2026-0904",
    department: "Bộ Môn Hệ Thống Nhúng & IoT",
    resourceName: "NVIDIA Jetson AGX Orin Kit",
    timeSlot: "22:00 — 06:00 (Giờ Xanh)",
    isGreenHours: true,
    amountVnd: 420000,
    originalAmountVnd: 760000,
    status: "RECONCILED",
    paymentMethod: "VietQR Auto-Debit",
    date: "09/09/2026 06:10"
  },
  {
    id: "TXN-2026-0905",
    department: "Bộ Môn Trí Tuệ Nhân Tạo & CV",
    resourceName: "NVIDIA DGX A100 SuperPOD",
    timeSlot: "18:00 — 22:00 (Cao Điểm EVN)",
    isGreenHours: false,
    amountVnd: 6370000,
    originalAmountVnd: 6370000,
    status: "RECONCILED",
    paymentMethod: "VietQR Auto-Debit",
    date: "09/09/2026 22:15"
  }
];

export const CostChargebackReport: React.FC = () => {
  const [transactions] = useState<PaymentTransaction[]>(SAMPLE_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // 3 Hero Metrics
  const originalCost = "18.420.000 đ";
  const greenOptimizedCost = "12.180.000 đ";
  const savingsPercent = "Tiết kiệm 33.8%";
  const conservedEnergy = "2.496 kWh";
  const co2Reduction = "Giảm 1.8 tấn CO₂";

  function handleExportCsv() {
    const headers = "Mã Giao Dịch,Phòng Ban / Đề Tài,Thiết Bị Sử Dụng,Khung Giờ,Số Tiền (VNĐ),Số Tiền Gốc (VNĐ),Trạng Thái,Phương Thức,Thời Gian\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.department}","${t.resourceName}","${t.timeSlot}",${t.amountVnd},${t.originalAmountVnd},"${t.status}","${t.paymentMethod}","${t.date}"`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EVN_Chargeback_Report_2026_09.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "ALL" || t.department.includes(deptFilter);
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              FINANCIAL CHARGEBACK & EVN BILLING 2026
            </span>
            <span className="led-pulse led-pulse-safe" />
            <span className="font-mono text-[11px] text-slate-400">PUE CHUẨN ĐO LƯỜNG: 1.12</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Báo Cáo Phân Bổ Chi Phí & Quyết Toán EVN
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Báo cáo đối soát tài chính nội bộ, biểu giá điện ba giá EVN và hiệu quả tiết kiệm từ Green AI
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="btn-evn-csv font-mono text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <Download size={14} />
          <span>📥 XUẤT BÁO CÁO CSV (EVN BILLING)</span>
        </button>
      </div>

      {/* 2. Three Hero Metrics Cards */}
      <div className="hero-metrics-grid">
        {/* Card 1: Tổng chi phí gốc */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              TỔNG CHI PHÍ ĐIỆN GỐC (BASELINE)
            </span>
            <DollarSign size={16} className="text-slate-400" />
          </div>
          <strong className="font-mono text-3xl font-bold text-white tracking-tight">
            {originalCost}
          </strong>
          <span className="text-[11px] text-slate-500 font-mono mt-2 block">
            Tính theo biểu giá EVN tiêu chuẩn không ca đêm
          </span>
        </div>

        {/* Card 2: Chi phí sau tối ưu Green AI */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-emerald-500/30 rounded-xl flex flex-col justify-between shadow-[0_0_25px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider font-bold">
              CHI PHÍ SAU TỐI ƯU GREEN AI
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
              {savingsPercent}
            </span>
          </div>
          <strong className="font-mono text-3xl font-bold text-emerald-300 tracking-tight">
            {greenOptimizedCost}
          </strong>
          <span className="text-[11px] text-emerald-400/80 font-mono mt-2 block">
            Tiết kiệm ròng: <strong>6.240.000 đ</strong> từ dịch chuyển giờ xanh
          </span>
        </div>

        {/* Card 3: Điện năng bảo tồn & CO2 */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-cyan-500/30 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Leaf size={14} />
              <span>ĐIỆN NĂNG BẢO TỒN</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
              {co2Reduction}
            </span>
          </div>
          <strong className="font-mono text-3xl font-bold text-cyan-300 tracking-tight">
            {conservedEnergy}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono mt-2 block">
            Hạn chế phụ tải đỉnh lưới điện Quốc gia EVN
          </span>
        </div>
      </div>

      {/* 3. Transaction History & Chargeback Table */}
      <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
        {/* Table Header & Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-3">
          <div>
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block">
              LỊCH SỬ GIAO DỊCH QUYẾT TOÁN TỰ ĐỘNG (CHARGEBACK AUDIT TRAIL)
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Dữ liệu đối soát tự động qua cổng thanh toán QR chuẩn VietQR 2026
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã / phòng ban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg pl-7 pr-3 py-1.5 w-48"
              />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg px-2.5 py-1.5"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="Trí Tuệ Nhân Tạo">Bộ Môn AI & CV</option>
              <option value="Robotics">Bộ Môn Robotics</option>
              <option value="Đồ Án Tốt Nghiệp">Đồ Án Tốt Nghiệp</option>
              <option value="Hệ Thống Nhúng">Bộ Môn Nhúng & IoT</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[11px] text-slate-400 uppercase">
                <th className="py-2.5 px-3">Mã Giao Dịch</th>
                <th className="py-2.5 px-3">Phòng Ban / Đề Tài</th>
                <th className="py-2.5 px-3">Thiết Bị Sử Dụng</th>
                <th className="py-2.5 px-3">Khung Giờ Vận Hành</th>
                <th className="py-2.5 px-3 text-right">Số Tiền (VNĐ)</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái VietQR</th>
                <th className="py-2.5 px-3">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-cyan-300 font-bold">{item.id}</td>
                  <td className="py-3 px-3 text-white font-medium">{item.department}</td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-[11.5px]">{item.resourceName}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded border inline-block ${
                        item.isGreenHours
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                          : "bg-black/40 text-slate-300 border-white/10"
                      }`}
                    >
                      {item.timeSlot}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white text-right text-sm">
                    {item.amountVnd.toLocaleString("vi-VN")} đ
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-[10.5px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-400" />
                      <span>ĐÃ ĐỐI SOÁT</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
