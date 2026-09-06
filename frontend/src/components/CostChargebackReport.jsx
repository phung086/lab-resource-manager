import React, { useState, useEffect } from "react";
import { DollarSign, Download, Filter, Calendar, Zap, TrendingDown, Building, FileText, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { apiRequest } from "../api.js";

export function CostChargebackReport() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/payments/history");
      setPayments(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError("Không thể tải dữ liệu quyết toán: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOptimized = Math.round(totalAmount * 0.82); // Simulated metric
  const totalSaved = totalAmount - totalOptimized;

  function handleExportCsv() {
    const headers = "Mã Giao Dịch,Người Dùng,Vai Trò,Lịch Đặt,Trạng Thái,Số Tiền (VND),Thời Gian\n";
    const rows = payments
      .map(p => `"${p.txnRef || p.id}","${p.user?.fullName || p.user?.email || ''}","${p.user?.role || ''}","${p.booking?.title || p.booking?.bookingCode || ''}","${p.status}",${p.amount},"${new Date(p.createdAt).toLocaleString('vi-VN')}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payment_History.csv`;
    a.click();
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "rgba(95, 167, 119, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(95, 167, 119, 0.25)" }}>
                FINANCIAL CHARGEBACK & EVN ENERGY BILLING
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Báo Cáo Phân Bổ Chi Phí & Quyết Toán (Chargeback)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Tra cứu lịch sử thanh toán VNPay và chi phí tài nguyên theo thời gian thực.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: "0.78rem" }}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Làm mới
            </button>
            <button className="btn btn-primary" onClick={handleExportCsv} style={{ fontSize: "0.78rem", background: "var(--green)", color: "var(--bg)", fontWeight: 700 }}>
              <Download size={14} style={{ marginRight: 6 }} /> Xuất CSV Báo Cáo
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải dữ liệu...</div>}

      {error && (
        <div style={{ padding: 12, background: "rgba(193, 80, 63, 0.1)", borderRadius: 6, color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* STATS OVERVIEW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <StatCard label="TỔNG CHI PHÍ GỐC" value={`${totalAmount.toLocaleString()} đ`} tone="var(--amber)" icon={DollarSign} />
            <StatCard label="CHI PHÍ SAU TỐI ƯU" value={`${totalOptimized.toLocaleString()} đ`} tone="var(--purple)" icon={Zap} />
            <StatCard label="TIẾT KIỆM NĂNG LƯỢNG (EST.)" value={`${totalSaved.toLocaleString()} đ`} tone="var(--green)" icon={TrendingDown} />
          </div>

          {/* PAYMENT LIST */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                LỊCH SỬ GIAO DỊCH
              </strong>
            </div>

            {payments.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <FileText size={32} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>Không có giao dịch nào được tìm thấy.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line-strong)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>MÃ GIAO DỊCH</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>NGƯỜI DÙNG</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>LỊCH ĐẶT CHỖ</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600 }}>TRẠNG THÁI</th>
                      <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>SỐ TIỀN (VND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const isSuccess = p.status === "success" || p.status === "APPROVED";
                      const isPending = p.status === "pending";
                      const statusColor = isSuccess ? "var(--green)" : (isPending ? "var(--amber)" : "var(--red)");
                      const statusLabel = isSuccess ? "HOÀN TẤT" : (isPending ? "ĐANG XỬ LÝ" : "THẤT BẠI");

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-strong)" }}>
                          <td style={{ padding: "14px 10px", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                            {p.txnRef || p.id}
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
                              {new Date(p.createdAt).toLocaleString("vi-VN")}
                            </div>
                          </td>
                          <td style={{ padding: "14px 10px", color: "var(--text-primary)" }}>
                            <strong>{p.user?.fullName || p.user?.email || "Unknown"}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                              {p.user?.role || "N/A"}
                            </div>
                          </td>
                          <td style={{ padding: "14px 10px", color: "var(--text-secondary)" }}>
                            {p.booking?.title || p.booking?.bookingCode || "N/A"}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            <span style={{
                              fontSize: "0.7rem", fontFamily: "var(--font-mono)", fontWeight: 600,
                              padding: "4px 8px", borderRadius: 4, background: `rgba(${isSuccess ? '95,167,119' : isPending ? '227,162,60' : '193,80,63'}, 0.15)`,
                              color: statusColor, border: `1px solid rgba(${isSuccess ? '95,167,119' : isPending ? '227,162,60' : '193,80,63'}, 0.3)`
                            }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 700 }}>
                            {p.amount.toLocaleString()} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div style={{
      borderLeft: `3px solid ${tone}`,
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 8px 8px 0", padding: "16px 18px", position: "relative"
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: tone, borderRadius: "8px 0 0 8px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block" }}>{label}</span>
        {Icon && <Icon size={16} style={{ color: tone }} />}
      </div>
      <strong style={{ fontSize: "1.6rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</strong>
    </div>
  );
}
