import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", padding: 40, textAlign: "center", color: "#f8fafc", background: "#0b0e14"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Đã xảy ra lỗi không mong đợi</h2>
          <p style={{ color: "#94a3b8", maxWidth: 480, marginBottom: 24, lineHeight: 1.6 }}>
            {this.state.error?.message || "Một component đã gặp lỗi khi render. Vui lòng tải lại trang."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px", borderRadius: 8, border: "none",
              background: "#3b82f6", color: "#fff", fontSize: 14,
              fontWeight: 600, cursor: "pointer", transition: "background 0.18s ease"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#2563eb"}
            onMouseOut={e => e.currentTarget.style.background = "#3b82f6"}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
