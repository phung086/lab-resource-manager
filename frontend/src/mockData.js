// Mock fallback data for offline resilience and demonstration
export const mockDashboard = {
  stats: {
    totalResources: 18,
    resourcesByType: { gpu_server: 6, raspberry_pi: 4, uav: 3, camera: 3, room: 2 },
    pendingBookings: 3,
    unreadNotifications: 2,
    alerts: 1
  },
  telemetry: [
    {
      resource: { id: "res-1", code: "GPU-H100-01", name: "NVIDIA DGX H100 Node 01", type: "gpu_server", status: "in_use", operationalStatus: "in_use", operational: { readinessScore: 96, attention: false } },
      latestTelemetry: { temperature: 68, powerWatts: 720 }
    },
    {
      resource: { id: "res-2", code: "GPU-A100-02", name: "NVIDIA DGX A100 Pod 02", type: "gpu_server", status: "in_use", operationalStatus: "in_use", operational: { readinessScore: 78, attention: true } },
      latestTelemetry: { temperature: 82, powerWatts: 650 }
    },
    {
      resource: { id: "res-3", code: "RPI-CLUSTER-01", name: "Raspberry Pi 5 Edge Cluster", type: "raspberry_pi", status: "available", operationalStatus: "available", operational: { readinessScore: 99, attention: false } },
      latestTelemetry: { temperature: 48, powerWatts: 28 }
    },
    {
      resource: { id: "res-4", code: "UAV-MATRICE-300", name: "DJI Matrice 300 RTK Autonomous", type: "uav", status: "available", operationalStatus: "available", operational: { readinessScore: 92, attention: false } },
      latestTelemetry: { temperature: 36, powerWatts: 140 }
    },
    {
      resource: { id: "res-5", code: "CAM-FLIR-A700", name: "FLIR A700 Thermal Vision Core", type: "camera", status: "available", operationalStatus: "available", operational: { readinessScore: 95, attention: false } },
      latestTelemetry: { temperature: 42, powerWatts: 45 }
    },
    {
      resource: { id: "res-6", code: "SERVER-SUPERMICRO-01", name: "Supermicro 4U Dual Xeon AI Node", type: "gpu_server", status: "available", operationalStatus: "available", operational: { readinessScore: 88, attention: false } },
      latestTelemetry: { temperature: 58, powerWatts: 380 }
    }
  ],
  upcomingBookings: [
    { id: "bk-1", resourceName: "NVIDIA DGX H100 Node 01", startAt: new Date(Date.now() + 3600000).toISOString(), endAt: new Date(Date.now() + 10800000).toISOString(), status: "approved", requestedBy: { fullName: "TS. Nguyễn Hoàng Minh" } },
    { id: "bk-2", resourceName: "DJI Matrice 300 RTK Autonomous", startAt: new Date(Date.now() + 7200000).toISOString(), endAt: new Date(Date.now() + 14400000).toISOString(), status: "pending", requestedBy: { fullName: "Lê Trần Gia Bảo" } },
    { id: "bk-3", resourceName: "Raspberry Pi 5 Edge Cluster", startAt: new Date(Date.now() + 86400000).toISOString(), endAt: new Date(Date.now() + 93600000).toISOString(), status: "approved", requestedBy: { fullName: "Trần Minh Đức" } }
  ]
};

export const mockResources = [
  {
    id: "res-1",
    code: "GPU-H100-01",
    name: "NVIDIA DGX H100 Node 01",
    type: "gpu_server",
    status: "in_use",
    operationalStatus: "in_use",
    location: "Khu vực Máy chủ Rack A-01",
    specs: { gpu: "8x SXM5 H100 80GB", cpu: "Dual Intel Xeon Platinum 8480C", ram: "2TB DDR5 ECC", vram: "640GB" },
    operational: { readinessScore: 96, attention: false },
    latestTelemetry: { temperature: 68, powerWatts: 720, fanSpeedRpm: 4800 }
  },
  {
    id: "res-2",
    code: "GPU-A100-02",
    name: "NVIDIA DGX A100 Pod 02",
    type: "gpu_server",
    status: "in_use",
    operationalStatus: "in_use",
    location: "Khu vực Máy chủ Rack A-02",
    specs: { gpu: "8x A100 80GB", cpu: "Dual AMD EPYC 7742", ram: "1TB DDR4 ECC", vram: "640GB" },
    operational: { readinessScore: 78, attention: true },
    latestTelemetry: { temperature: 82, powerWatts: 650, fanSpeedRpm: 5400 }
  },
  {
    id: "res-3",
    code: "RPI-CLUSTER-01",
    name: "Raspberry Pi 5 Edge Cluster",
    type: "raspberry_pi",
    status: "available",
    operationalStatus: "available",
    location: "Bàn thực nghiệm IoT B-03",
    specs: { nodes: "8x Raspberry Pi 5 8GB", ram: "64GB Total", storage: "1TB NVMe" },
    operational: { readinessScore: 99, attention: false },
    latestTelemetry: { temperature: 48, powerWatts: 28 }
  },
  {
    id: "res-4",
    code: "UAV-MATRICE-300",
    name: "DJI Matrice 300 RTK Autonomous",
    type: "uav",
    status: "available",
    operationalStatus: "available",
    location: "Tủ lưu trữ UAV C-01",
    specs: { payload: "Zenmuse H20T + LiDAR", flightTime: "55 mins", range: "15km" },
    operational: { readinessScore: 92, attention: false },
    latestTelemetry: { temperature: 36, powerWatts: 140 }
  },
  {
    id: "res-5",
    code: "CAM-FLIR-A700",
    name: "FLIR A700 Thermal Vision Core",
    type: "camera",
    status: "available",
    operationalStatus: "available",
    location: "Trạm kiểm định quang học B-01",
    specs: { resolution: "640x480 Thermal", accuracy: "±2°C", fps: "30Hz" },
    operational: { readinessScore: 95, attention: false },
    latestTelemetry: { temperature: 42, powerWatts: 45 }
  },
  {
    id: "res-6",
    code: "SERVER-SUPERMICRO-01",
    name: "Supermicro 4U Dual Xeon AI Node",
    type: "gpu_server",
    status: "available",
    operationalStatus: "available",
    location: "Khu vực Máy chủ Rack B-01",
    specs: { gpu: "4x RTX 4090 24GB", cpu: "Dual Xeon Gold 6430", ram: "512GB" },
    operational: { readinessScore: 88, attention: false },
    latestTelemetry: { temperature: 58, powerWatts: 380 }
  }
];

export const mockBookings = [
  {
    id: "bk-101",
    bookingCode: "BK-2026-H100-01",
    title: "Huấn luyện mô hình Vi-LLM 70B MoE",
    resourceId: "res-1",
    resource: { code: "GPU-H100-01", name: "NVIDIA DGX H100 Node 01", type: "gpu_server" },
    startAt: new Date(Date.now() + 3600000).toISOString(),
    endAt: new Date(Date.now() + 10800000).toISOString(),
    status: "approved",
    requestedBy: { fullName: "TS. Nguyễn Hoàng Minh", email: "minh.nh@lab.local", role: "admin" },
    notes: "Đề tài cấp nhà nước về LLM tiếng Việt",
    amount: 1500000
  },
  {
    id: "bk-102",
    bookingCode: "BK-2026-UAV-02",
    title: "Bay quét 3D địa hình khu công nghệ cao",
    resourceId: "res-4",
    resource: { code: "UAV-MATRICE-300", name: "DJI Matrice 300 RTK Autonomous", type: "uav" },
    startAt: new Date(Date.now() + 7200000).toISOString(),
    endAt: new Date(Date.now() + 14400000).toISOString(),
    status: "pending",
    requestedBy: { fullName: "Lê Trần Gia Bảo", email: "bao.ltg@lab.local", role: "student" },
    notes: "Thu thập dữ liệu luận văn tốt nghiệp",
    amount: 500000
  },
  {
    id: "bk-103",
    bookingCode: "BK-2026-RPI-03",
    title: "Triển khai cụm Kubernetes K3s Edge",
    resourceId: "res-3",
    resource: { code: "RPI-CLUSTER-01", name: "Raspberry Pi 5 Edge Cluster", type: "raspberry_pi" },
    startAt: new Date(Date.now() - 3600000).toISOString(),
    endAt: new Date(Date.now() + 3600000).toISOString(),
    status: "checked_out",
    requestedBy: { fullName: "Trần Minh Đức", email: "duc.tm@lab.local", role: "student" },
    notes: "Nghiên cứu kiến trúc phân tán thời gian thực",
    amount: 200000
  }
];

export const mockIncidents = [
  {
    id: "inc-1",
    title: "Cảnh báo nhiệt độ ngưỡng vàng GPU A100 Pod 02",
    description: "Cảm biến nhiệt độ ghi nhận 82°C trong 15 phút liên tục khi chạy tải ma trận FP16.",
    severity: "warning",
    status: "investigating",
    resource: { name: "NVIDIA DGX A100 Pod 02" },
    reportedBy: { fullName: "Hệ thống Giám sát Telemetry" },
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

export const mockTrainings = {
  courses: [
    {
      id: "course-1",
      code: "SAFE-AI-101",
      name: "Quy chuẩn An toàn & Vận hành Cụm Siêu máy tính GPU",
      description: "Đào tạo bắt buộc về kiểm soát tải điện, an toàn cháy nổ và quy trình đóng ngắt khẩn cấp E-Stop.",
      durationHours: 4,
      isRequired: true
    },
    {
      id: "course-2",
      code: "UAV-PILOT-201",
      name: "Chứng chỉ Phi công Điều khiển Thiết bị bay Không người lái",
      description: "Quy chuẩn an toàn bay khu vực đô thị, xử lý mất tín hiệu GPS và kiểm tra pin LiPo chuyên dụng.",
      durationHours: 8,
      isRequired: true
    }
  ],
  certifications: [
    {
      id: "cert-1",
      courseId: "course-1",
      course: { name: "Quy chuẩn An toàn & Vận hành Cụm Siêu máy tính GPU" },
      status: "active",
      issuedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 335 * 86400000).toISOString(),
      notes: "Đạt điểm 100/100 bài thi thực hành"
    }
  ]
};
