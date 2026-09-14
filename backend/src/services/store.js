/**
 * In-memory fallback data store for Smart Booking & AI Advisory Platform
 * Ensures 100% uptime and resilience even if external PostgreSQL is offline
 */

export const mockStore = {
  resources: [
    {
      id: "NODE-DGX-01",
      code: "NODE-DGX-01",
      name: "Cụm GPU NVIDIA DGX H100 SXM5",
      category: "GPU_CLUSTER",
      hourlyRateVnd: 180000,
      hourlyRate: 180000,
      capacity: 8,
      location: "Phòng Máy Chủ AI Tầng 4",
      status: "available",
      specs: {
        gpu: "8x NVIDIA H100 80GB SXM5",
        vram: "640 GB HBM3 (3.35 TB/s bandwidth)",
        cpu: "Dual AMD EPYC 9654 (192 Cores)",
        ram: "2 TB DDR5-4800 ECC"
      },
      activeBookingsCount: 1
    },
    {
      id: "ROOM-IMM-301",
      code: "ROOM-IMM-301",
      name: "Phòng Hội Thảo & Lab AI Immersive",
      category: "LAB_ROOM",
      hourlyRateVnd: 250000,
      hourlyRate: 250000,
      capacity: 24,
      location: "Tòa Nhà R&D Tầng 3",
      status: "available",
      specs: {
        seats: 24,
        displays: "Dual 4K Ultra-Wide 120Hz Interactive",
        network: "10 Gbps Low-Latency Optical Fiber"
      },
      activeBookingsCount: 1
    },
    {
      id: "WS-L40S-04",
      code: "WS-L40S-04",
      name: "Trạm L40S Enterprise Workstation",
      category: "GPU_CLUSTER",
      hourlyRateVnd: 95000,
      hourlyRate: 95000,
      capacity: 4,
      location: "Lab Thị Giác Máy Tính 202",
      status: "available",
      specs: {
        gpu: "4x NVIDIA L40S 48GB Ada Lovelace",
        vram: "192 GB GDDR6 with ECC",
        cpu: "Intel Xeon W9-3495X (56 Cores)"
      },
      activeBookingsCount: 0
    },
    {
      id: "EDGE-ORIN-02",
      code: "EDGE-ORIN-02",
      name: "Cụm Thử Nghiệm Edge Jetson AGX Orin",
      category: "EDGE_KIT",
      hourlyRateVnd: 60000,
      hourlyRate: 60000,
      capacity: 12,
      location: "Lab Robotics & UAV",
      status: "maintenance",
      specs: {
        nodes: "12x Jetson AGX Orin 64GB Industrial",
        compute: "275 TOPS AI Performance each"
      },
      activeBookingsCount: 0
    }
  ],

  users: [
    {
      id: "admin-01",
      email: "admin@lab.local",
      fullName: "TS. Nguyễn Hoàng Minh",
      role: "admin",
      monthlyQuotaHours: 200,
      usedQuotaHours: 18,
      reputationScore: 100,
      department: "Trung tâm Điều phối AI Lab 2026",
      studentId: "GV-AI-01",
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "user-02",
      email: "hung.nv@lab-ai.edu.vn",
      fullName: "TS. Nguyễn Văn Hùng",
      role: "instructor",
      monthlyQuotaHours: 60,
      usedQuotaHours: 42,
      reputationScore: 99,
      department: "Khoa Công Nghệ Thông Tin",
      studentId: "GV-IT-04",
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "user-03",
      email: "long.lh@lab-ai.edu.vn",
      fullName: "Lê Hoàng Long",
      role: "researcher",
      monthlyQuotaHours: 80,
      usedQuotaHours: 58,
      reputationScore: 97,
      department: "Viện Nghiên cứu Trí tuệ Nhân tạo",
      studentId: "NCS-AI-02",
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "user-04",
      email: "student@lab.local",
      fullName: "Phạm Minh Khôi",
      role: "student",
      monthlyQuotaHours: 30,
      usedQuotaHours: 28,
      reputationScore: 88,
      department: "KSTN Trí Tuệ Nhân Tạo K66",
      studentId: "20261088",
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],

  bookings: [
    {
      id: "BK-9921",
      resourceId: "NODE-DGX-01",
      userId: "user-03",
      title: "Huấn luyện DeepSeek-R1 Distill (Paper CVPR)",
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      status: "CONFIRMED",
      totalPriceVnd: 360000,
      checkinCode: "214ae7c1",
      attendeesCount: 2,
      resource: {
        id: "NODE-DGX-01",
        name: "Cụm GPU NVIDIA DGX H100 SXM5",
        category: "GPU_CLUSTER"
      },
      user: {
        id: "user-03",
        fullName: "Lê Hoàng Long",
        email: "long.lh@lab-ai.edu.vn"
      }
    }
  ],

  transactions: [
    {
      id: "TXN-2026-0910-001",
      bookingRef: "BK-214AE7C1",
      userName: "Lê Hoàng Long",
      userEmail: "long.lh@lab-ai.edu.vn",
      resourceName: "Cụm GPU NVIDIA DGX H100 SXM5",
      timeSlot: "09:00 - 11:00 (2h)",
      amountVnd: 360000,
      paymentMethod: "VietQR Napas247",
      status: "paid",
      timestamp: "10/09/2026 09:12"
    },
    {
      id: "TXN-2026-0910-002",
      bookingRef: "BK-9922",
      userName: "TS. Nguyễn Văn Hùng",
      userEmail: "hung.nv@lab-ai.edu.vn",
      resourceName: "Phòng Hội Thảo Immersive 301",
      timeSlot: "13:00 - 15:00 (2h)",
      amountVnd: 500000,
      paymentMethod: "VietQR Napas247",
      status: "paid",
      timestamp: "10/09/2026 10:30"
    }
  ]
};
