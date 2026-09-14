import React, { useState } from "react";
import {
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  BarChart3
} from "lucide-react";

export const EfficiencyAnalyticsView: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("month");
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string; value: number } | null>(null);

  const heroMetrics = [
    {
      title: "TỶ LỆ LẤP ĐẦY CA (UTILIZATION)",
      value: "84.5%",
      subtext: "+6.2% so với tháng trước",
      icon: Activity,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      bgGlow: "bg-cyan-500/10"
    },
    {
      title: "ĐIỂM HIỆU QUẢ SỬ DỤNG (EFFICIENCY)",
      value: "92 / 100",
      subtext: "Hạng A+ Tối Ưu Toàn Diện",
      icon: Sparkles,
      color: "text-violet-400",
      borderColor: "border-violet-500/30",
      bgGlow: "bg-violet-500/10"
    },
    {
      title: "THỜI GIAN NHÀN RỖI TIẾT KIỆM",
      value: "14.2 giờ / tuần",
      subtext: "Giảm lãng phí ~2.840.000 đ",
      icon: Clock,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgGlow: "bg-emerald-500/10"
    },
    {
      title: "TỶ LỆ CAM KẾT & ĐÚNG GIỜ",
      value: "96.0%",
      subtext: "Điểm uy tín trung bình 94/100",
      icon: ShieldCheck,
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
      bgGlow: "bg-amber-500/10"
    }
  ];

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const hours = ["08h", "09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h"];

  // Heatmap density matrix (0: Low, 1: Moderate, 2: Busy, 3: Peak, 4: Overloaded)
  const heatmapData: number[][] = [
    [1, 2, 3, 3, 1, 2, 4, 3, 2, 2, 1, 0], // T2
    [1, 3, 4, 3, 1, 2, 3, 4, 3, 2, 1, 0], // T3
    [2, 3, 4, 4, 2, 3, 4, 4, 3, 2, 1, 1], // T4
    [1, 3, 4, 3, 2, 3, 4, 4, 3, 3, 2, 1], // T5
    [2, 4, 4, 3, 1, 2, 4, 3, 2, 1, 1, 0], // T6
    [1, 1, 2, 2, 0, 1, 2, 2, 1, 1, 0, 0], // T7
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0]  // CN
  ];

  const comparisonFactors = [
    {
      label: "Thời gian chờ đợi & sắp xếp ca",
      before: "45 phút",
      after: "4.2 phút",
      improvement: "Giảm 90.7%",
      isPositive: true
    },
    {
      label: "Tỷ lệ xung đột trùng lịch",
      before: "28.5%",
      after: "1.4%",
      improvement: "Giảm 95.1%",
      isPositive: true
    },
    {
      label: "Chi phí điện & phụ phí giờ cao điểm",
      before: "18.420.000 đ",
      after: "12.180.000 đ",
      improvement: "Tiết kiệm 33.8%",
      isPositive: true
    },
    {
      label: "Mức độ hài lòng của người đặt lịch",
      before: "74 / 100",
      after: "96 / 100",
      improvement: "Tăng +22 điểm",
      isPositive: true
    }
  ];

  function handleExportReport() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Chi So,Gia Tri,Ghi Chu\n" +
      "Ty Le Lap Day (Utilization),84.5%,Tang 6.2%\n" +
      "Diem Hieu Qua,92/100,Hang A+\n" +
      "Gio Nhan Roi Tiet Kiem,14.2h/tuan,Tiet kiem 2.840.000 VND\n" +
      "Ty Le Cam Ket Dung Gio,96.0%,Diem uy tin 94/100\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_Cao_Hieu_Suat_AI_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Header Bar */}
      <div className="card-glass-2026 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-violet-400 bg-violet-950/60 px-2.5 py-0.5 rounded border border-violet-500/30 font-bold">
              AI PERFORMANCE ENGINE
            </span>
            <span className="font-mono text-xs text-slate-500">• THỜI GIAN THỰC 2026</span>
          </div>
          <h2 className="text-xl font-bold font-heading text-white tracking-tight">
            Đánh Giá Hiệu Suất Đặt Chỗ & Tối Ưu Hóa Khung Giờ
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            AI tự động phân tích dữ liệu lịch sử đặt lịch để loại bỏ thời gian chết, giảm chi phí vận hành và nâng cao điểm uy tín hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedTimeRange("week")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTimeRange === "week"
                  ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              7 Ngày
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeRange("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTimeRange === "month"
                  ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              30 Ngày
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-mono text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download size={14} className="text-cyan-400" />
            <span>Xuất Báo Cáo CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Hero Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heroMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.title}
              className={`card-glass-2026 p-4 border ${m.borderColor} relative overflow-hidden flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
                  {m.title}
                </span>
                <div className={`w-8 h-8 rounded-lg ${m.bgGlow} flex items-center justify-center ${m.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="my-1">
                <span className={`font-mono text-2xl font-bold tracking-tight ${m.color}`}>
                  {m.value}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} className="text-emerald-400" />
                <span>{m.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid Section */}
      <div className="card-glass-2026 p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase">
                BIỂU ĐỒ NHIỆT MẬT ĐỘ ĐẶT LỊCH (HEATMAP MATRIX)
              </span>
              <span className="font-mono text-[10.5px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                THỨ TRONG TUẦN × KHUNG GIỜ
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Xác định khung giờ vàng vắng người (Màu Cyan) để đặt lịch trơn tru và tránh các khung giờ cao điểm (Màu Đỏ Cam).
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-slate-400">
            <span>Mức tải:</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-white/5 border border-white/10" title="Vắng" />
              <span className="w-3.5 h-3.5 rounded bg-cyan-500/25 border border-cyan-400/30" title="Ít" />
              <span className="w-3.5 h-3.5 rounded bg-cyan-500/60 border border-cyan-400" title="Vừa" />
              <span className="w-3.5 h-3.5 rounded bg-amber-500/60 border border-amber-400" title="Cao" />
              <span className="w-3.5 h-3.5 rounded bg-rose-500/80 border border-rose-400" title="Quá tải" />
            </div>
            <span className="text-rose-400 font-bold">Cao điểm</span>
          </div>
        </div>

        {/* Heatmap Matrix */}
        <div className="overflow-x-auto">
          <div className="heatmap-matrix-grid min-w-[760px]">
            {/* Hour Header */}
            <div className="font-mono text-xs text-slate-500 pb-2">Ngày \ Giờ</div>
            {hours.map((h) => (
              <div key={h} className="font-mono text-xs text-center text-slate-400 pb-2">
                {h}
              </div>
            ))}

            {/* Day Rows */}
            {daysOfWeek.map((day, dIdx) => (
              <React.Fragment key={day}>
                <div className="font-sans text-xs font-bold text-slate-300 pr-2 flex items-center">
                  {day}
                </div>
                {hours.map((hour, hIdx) => {
                  const density = heatmapData[dIdx][hIdx];
                  const cellClass = `heatmap-cell heatmap-cell-${density}`;

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cellClass}
                      onMouseEnter={() => setHoveredCell({ day, hour, value: density })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${day} lúc ${hour}: Mật độ tải ${density * 25}%`}
                    >
                      <span>{density > 0 ? `${density * 25}%` : "-"}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Dynamic Tooltip Bar */}
        <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            {hoveredCell ? (
              <span>
                Đang soi: <strong className="text-cyan-300">{hoveredCell.day}</strong> lúc{" "}
                <strong className="text-white">{hoveredCell.hour}</strong> • Tỷ lệ chiếm dụng:{" "}
                <strong className={hoveredCell.value >= 3 ? "text-amber-400" : "text-emerald-400"}>
                  {hoveredCell.value * 25}%
                </strong>
              </span>
            ) : (
              <span>💡 Di chuột lên ô ma trận để xem chi tiết mật độ chiếm dụng theo từng giờ.</span>
            )}
          </span>
          <span className="text-cyan-400 flex items-center gap-1 font-bold">
            <Sparkles size={13} />
            <span>AI Đề Xuất: Đặt vào 08h — 10h hoặc sau 19h để có trải nghiệm mượt mà nhất.</span>
          </span>
        </div>
      </div>

      {/* Before vs After AI Advisory Comparison Card */}
      <div className="card-glass-2026 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="font-mono text-xs text-emerald-400 font-bold uppercase">
              TÁC ĐỘNG TỐI ƯU CỦA TRỢ LÝ AI (BEFORE VS AFTER ADVISORY)
            </span>
            <h3 className="text-base font-bold font-heading text-white mt-1">
              Hiệu Quả Trước Và Sau Khi Người Dùng Áp Dụng Tư Vấn Lịch AI
            </h3>
          </div>
          <span className="font-mono text-xs bg-emerald-950/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
            TỔNG TIẾT KIỆM: +38.5% HIỆU SUẤT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {comparisonFactors.map((factor) => (
            <div
              key={factor.label}
              className="p-4 bg-black/30 border border-white/10 rounded-xl flex flex-col justify-between gap-3"
            >
              <span className="text-xs font-sans text-slate-300 leading-snug">{factor.label}</span>

              <div className="flex items-baseline justify-between pt-2 border-t border-white/5 font-mono">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 line-through">{factor.before}</span>
                  <strong className="text-base text-white">{factor.after}</strong>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {factor.improvement}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
