# BẢNG ĐÁNH GIÁ KIỂM TOÁN HỆ THỐNG (SYSTEM AUDIT MATRIX - PHASE 0)

| Phân hệ / Module | Trạng thái | Giữ | Sửa / Nâng cấp | Xóa | Research Value (1-5) | Định hướng Refactor trong V2 |
|---|---|---|---|---|---|---|
| **Booking Engine** | Hoàn thiện | ✅ | ✅ | | **5/5** | Chuyển từ "Booking-centric" sang "Requirement -> Allocation", giữ nguyên row-level lock & GiST constraint. |
| **Genetic Algorithm (GA)** | Hoàn thiện | ✅ | ✅ | | **5/5** | Nâng cấp từ single GA lên Multi-Objective Stack (FIFO, Greedy, GA, NSGA-II) và đo đạc Pareto Frontier. |
| **Digital Twin Canvas** | Hoàn thiện (2D) | ✅ | ✅ | | **5/5** | Nâng cấp 4 tầng (Physical, Live State, Prediction, Simulation), gắn nhãn Real vs Simulated vs Derived. |
| **Priority & Fair-share** | Hoàn thiện | ✅ | ✅ | | **5/5** | Bổ sung công thức Jain's Fairness Index $J = \frac{(\sum x_i)^2}{n \sum x_i^2}$ và provenance tracking. |
| **Predictive Maintenance** | Hoàn thiện | ✅ | ✅ | | **4/5** | Chuẩn hóa 3 tầng: Level 1 (Rules), Level 2 (Statistical Z-score/EWMA), Level 3 (ML RUL). |
| **Incident Management** | Hoàn thiện | ✅ | ✅ | | **4/5** | Tích hợp sâu vào Digital Twin Replay và quy trình failover tự động. |
| **Training & Safety Quiz** | Hoàn thiện | ✅ | | | **3/5** | Giữ nguyên làm ràng buộc an toàn (Certification Check) cho Optimization Engine. |
| **Policy Engine** | Sơ khai (LabPolicy) | ✅ | ✅ | | **5/5** | Refactor thành Policy-driven Architecture với `PolicyVersion` (Biểu giá điện 2026, Fairness, Quota). |
| **AI Copilot & Decision Support** | Hoàn thiện | ✅ | ✅ | | **5/5** | Nâng cấp thành Decision Support Agent (Intent -> Matching -> Policy -> NSGA-II -> Explainability). |
| **MCP Server** | Hoàn thiện | ✅ | ✅ | | **4/5** | Bổ sung Human-in-the-loop confirmation cho write tools và audit log. |
| **Telemetry & Sensor Generator** | Hoàn thiện | ✅ | ✅ | | **4/5** | Hỗ trợ MQTT Event-driven streaming và Digital Twin Replay. |
| **Scenario Simulation Studio** | Hoàn thiện | ✅ | ✅ | | **5/5** | Nâng thành Experiment Runner (Dataset generator N=30/50 runs, seeds, Ablation study). |
| **VNPay Payment Gateway** | Hoàn thiện | ✅ | | | **1/5** | Giữ nguyên phục vụ tiện ích, không mở rộng thêm. |
| **GHN Logistics API** | Hoàn thiện | ✅ | | | **1/5** | Giữ nguyên phục vụ chuỗi cung ứng linh kiện, không mở rộng thêm. |
| **VietQR Dynamic Generator** | Hoàn thiện | ✅ | | | **1/5** | Giữ nguyên phục vụ tiện ích thanh toán. |
| **User & RBAC Management** | Hoàn thiện | ✅ | ✅ | | **3/5** | Bổ sung Refresh token rotation, Session management và audit trail. |
