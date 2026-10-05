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
  PENDING_APPROVAL: "ui.pending_approval_9aa55303",
  CONFIRMED: "ui.confirmed_e72d13e3",
  CHECKED_OUT: "ui.in_use_a07a3647",
  RETURNED: "ui.returned_fd3eb4fb",
  COMPLETED: "ui.completed_b0484236",
  REJECTED: "ui.reject_b61a0ebc",
  CANCELLED: "ui.cancelled_2f777a90"
};

export const CANONICAL_CUSTOMER_TYPE_LABELS = {
  INTERNAL: "ui.institution_member_self_declared_8250710f",
  EXTERNAL: "ui.external_customer_partner_self_declared_75407cc4"
};

