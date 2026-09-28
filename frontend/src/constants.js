export const createResourceStatuses = ["available", "maintenance", "offline"];

export const resourceStatusActions = [
  { status: "available", actionKey: "setAvailable" },
  { status: "maintenance", actionKey: "setMaintenance" },
  { status: "offline", actionKey: "setOffline" }
];

export const resourceGlyphLabels = {
  gpu_server: "GPU",
  raspberry_pi: "Pi",
  uav: "UAV",
  camera: "CAM",
  room: "LAB",
  kit: "KIT",
  material: "MAT"
};

export const monitoringDefaults = {
  utilizationWarningPercent: 85,
  utilizationCriticalPercent: 95,
  diskWarningPercent: 85,
  diskCriticalPercent: 95,
  temperatureWarningC: 75,
  temperatureCriticalC: 85,
  staleMinutes: 15
};

export const emptyBookingForm = {
  resourceId: "",
  title: "",
  purpose: "",
  startAt: "",
  endAt: "",
  notes: ""
};

export const emptyUserForm = {
  email: "",
  fullName: "",
  role: "",
  password: "",
  isActive: true
};

export const emptyMaintenanceForm = {
  resourceId: "",
  title: "",
  kind: "maintenance",
  scheduledStart: "",
  scheduledEnd: "",
  notes: ""
};


export const emptyResourceForm = {
  code: "",
  name: "",
  type: "",
  location: "",
  status: "",
  ownerTeam: "",
  capacity: "",
  requiresApproval: true,
  specsText: ""
};

export const CANONICAL_BOOKING_STATUS_LABELS = {
  PENDING_APPROVAL: "Chờ phê duyệt",
  CONFIRMED: "Đã xác nhận",
  CHECKED_OUT: "Đang sử dụng",
  RETURNED: "Đã hoàn trả",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy"
};

export const CANONICAL_CUSTOMER_TYPE_LABELS = {
  INTERNAL: "Nội bộ trường (tự khai)",
  EXTERNAL: "Khách ngoài / đối tác (tự khai)"
};

