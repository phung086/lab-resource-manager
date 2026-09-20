export const RESOURCE_CATEGORIES = ["ROOM", "EQUIPMENT", "MACHINE", "EXPERIMENT_KIT", "MATERIAL"];

export const RESOURCE_SUBTYPES = [
  "ROOM",
  "GPU_SERVER",
  "RASPBERRY_PI",
  "UAV",
  "CAMERA",
  "KIT",
  "MATERIAL",
  "OTHER"
];

export const OPERATIONAL_STATUSES = [
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "CALIBRATION",
  "BROKEN",
  "RETIRED",
  "OFFLINE"
];

export const BOOKING_STATES = ["bookable", "restricted", "non_bookable"];

export const STATUS_REASON_REQUIRED = new Set([
  "MAINTENANCE",
  "CALIBRATION",
  "BROKEN",
  "RETIRED",
  "OFFLINE"
]);

export function compatibilityStatusFor(operationalStatus) {
  switch (operationalStatus) {
    case "AVAILABLE": return "available";
    case "IN_USE": return "in_use";
    case "MAINTENANCE":
    case "CALIBRATION":
    case "BROKEN": return "maintenance";
    case "RETIRED":
    case "OFFLINE": return "offline";
    default: throw new Error(`Unsupported operational status: ${operationalStatus}`);
  }
}
