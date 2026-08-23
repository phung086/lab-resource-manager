import React, { useState } from "react";
import { DollarSign, Download, Printer, Filter, Calendar, Zap, TrendingDown, Building, FileText, CheckCircle2 } from "lucide-react";

export function CostChargebackReport() {
  const [selectedMonth, setSelectedMonth] = useState("08/2026");

  const billingRecords = [
    {
      id: "INV-2026-08-01",
      dept: "Phòng Thí Nghiệm AI & Thị Giác",
      project: "Mô Hình Thị Giác 3D (CVPR)",
      lead: "PGS.TS. Trần Văn Minh",
      gpuHours: 184,
      energyKwh: 101.2,
      greenRatio: "42%",
      rawCostVnd: 284000,
      optimizedCostVnd: 212500,
      savedVnd: 71500,
      status: "APPROVED"
    },
    {
      id: "INV-2026-08-02",
      dept: "Trung Tâm Robotics & Thiết Bị Bay",
      project: "SLAM Tự Hành Drone Matrice 300",
      lead: "TS. Hoàng Quốc Bảo",
      gpuHours: 98,
      energyKwh: 53.9,
      greenRatio: "58%",
      rawCostVnd: 152000,
      optimizedCostVnd: 108400,
      savedVnd: 43600,
      status: "APPROVED"
    },
    {
      id: "INV-2026-08-03",
      dept: "Nhóm Nghiên Cứu Tin Y Sinh Học",
      project: "Phân Tích Cấu Trúc Protein",
      lead: "TS. Lê Thị Mai",
      gpuHours: 54,
      energyKwh: 29.7,
      greenRatio: "65%",
      rawCostVnd: 84000,
      optimizedCostVnd: 56200,
      savedVnd: 27800,
      status: "APPROVED"
    },
    {
      id: "INV-2026-08-04",
      dept: "Sinh Viên Làm Đồ Án Tốt Nghiệp",
      project: "Huấn Luyện Transformer ĐATN",
      lead: "ThS. Phạm Tuấn Kiệt",
      gpuHours: 172,
      energyKwh: 94.6,
      greenRatio: "35%",
      rawCostVnd: 268000,
      optimizedCostVnd: 218900,
      savedVnd: 49100,
      status: "PENDING_RECONCILIATION"
    }
  ];

  const totalRaw = billingRecords.reduce((acc, r) => acc + r.rawCostVnd, 0);
  const totalOptimized = billingRecords.reduce((acc, r) => acc + r.optimizedCostVnd, 0);
  const totalSaved = billingRecords.reduce((acc, r) => acc + r.savedVnd, 0);
  const totalKwh = billingRecords.reduce((acc, r) => acc + r.energyKwh, 0);

  function handleExportCsv() {
    const headers = "Mã Quyết Toán,Phòng Ban,Dự Án,Chủ Nhiệm,Số Giờ GPU,Điện Năng (kWh),Tỷ Lệ Giờ Xanh,Chi Phí Gốc (VND),Chi Phí Tối Ưu (VND),Tiết Kiệm (VND)\n";
    const rows = billingRecords
      .map(
        (r) =>
          `"${r.id}","${r.dept}","${r.project}","${r.lead}",${r.gpuHours},${r.energyKwh},"${r.greenRatio}",${r.rawCostVnd},${r.optimizedCostVnd},${r.savedVnd}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Chargeback_Report_${selectedMonth.replace("/", "_")}.csv`;
    a.click();
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981", background: "rgba(16, 185, 129, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                FINANCIAL CHARGEBACK & EVN ENERGY BILLING
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>
                ● TOÀN BỘ DỮ LIỆU ĐÃ KIỂM TOÁN
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Báo Cáo Phân Bổ Chi Phí & Quyết Toán Điện Năng (Cost Chargeback Report)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Tổng hợp chi phí điện năng EVN thực tế theo từng đề tài/phòng ban, minh chứng giá trị tiết kiệm tài chính của thuật toán điều phối đa mục tiêu.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", padding: "8px 14px", fontFamily: "var(--font-mono)" }}
            >
              <Printer size={14} />
              In Báo Cáo PDF
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExportCsv}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", padding: "8px 16px", fontFamily: "var(--font-mono)", background: "#10b981", color: "#0b0e14", fontWeight: 800 }}
            >
              <Download size={14} />
              Xuất File CSV
            </button>
          </div>
        </div>
      </div>

      {/* FINANCIAL SUMMARY INSTRUMENTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block" }}>TỔNG ĐIỆN TIÊU THỤ</span>
          <strong style={{ fontSize: "1.6rem", color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
            {totalKwh.toFixed(1)} kWh
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>508 Giờ GPU toàn phòng Lab</div>
        </div>

        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block" }}>CHI PHÍ NẾU CHẠY FIFO</span>
          <strong style={{ fontSize: "1.6rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
            {totalRaw.toLocaleString("vi-VN")} đ
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>Chưa tối ưu biểu giá 3 giá</div>
        </div>

        <div style={{ background: "#111620", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#06b6d4", fontFamily: "var(--font-mono)", display: "block" }}>CHI PHÍ THỰC TẾ (NSGA-II)</span>
          <strong style={{ fontSize: "1.6rem", color: "#06b6d4", fontFamily: "var(--font-mono)" }}>
            {totalOptimized.toLocaleString("vi-VN")} đ
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 2 }}>Đã áp dụng khung giờ Xanh</div>
        </div>

        <div style={{ background: "#111620", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#10b981", fontFamily: "var(--font-mono)", display: "block" }}>TIẾT KIỆM CHO NHÀ TRƯỜNG</span>
          <strong style={{ fontSize: "1.6rem", color: "#10b981", fontFamily: "var(--font-mono)" }}>
            -{totalSaved.toLocaleString("vi-VN")} đ
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 2 }}>Giảm {Math.round((totalSaved / totalRaw) * 100)}% ngân sách điện năng</div>
        </div>
      </div>

      {/* DETAILED CHARGEBACK TABLE */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ fontSize: "0.9rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
            BẢNG QUYẾT TOÁN CHI TIẾT THEO PHÒNG BAN & DỰ ÁN ({selectedMonth})
          </strong>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#64748b" }}>
            Biểu giá EVN 3 giá: 1.100 đ (Xanh) - 1.685 đ (Chuẩn) - 3.190 đ (Cao điểm)
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                <th style={{ padding: "10px", color: "#64748b" }}>MÃ QUYẾT TOÁN</th>
                <th style={{ padding: "10px", color: "#64748b" }}>PHÒNG BAN / DỰ ÁN</th>
                <th style={{ padding: "10px", color: "#64748b" }}>CHỦ NHIỆM</th>
                <th style={{ padding: "10px", color: "#64748b" }}>SỐ GIỜ GPU</th>
                <th style={{ padding: "10px", color: "#64748b" }}>ĐIỆN (kWh)</th>
                <th style={{ padding: "10px", color: "#64748b" }}>GIỜ XANH</th>
                <th style={{ padding: "10px", color: "#64748b" }}>QUYẾT TOÁN (VND)</th>
                <th style={{ padding: "10px", color: "#64748b" }}>TIẾT KIỆM</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "12px 10px", color: "#06b6d4" }}>{r.id}</td>
                  <td style={{ padding: "12px 10px" }}>
                    <strong style={{ color: "#f8fafc", display: "block" }}>{r.dept}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{r.project}</span>
                  </td>
                  <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{r.lead}</td>
                  <td style={{ padding: "12px 10px", color: "#f8fafc" }}>{r.gpuHours}h</td>
                  <td style={{ padding: "12px 10px", color: "#94a3b8" }}>{r.energyKwh} kWh</td>
                  <td style={{ padding: "12px 10px", color: "#10b981" }}>{r.greenRatio}</td>
                  <td style={{ padding: "12px 10px", color: "#f8fafc", fontWeight: 700 }}>
                    {r.optimizedCostVnd.toLocaleString("vi-VN")} đ
                  </td>
                  <td style={{ padding: "12px 10px", color: "#10b981" }}>
                    -{r.savedVnd.toLocaleString("vi-VN")} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
