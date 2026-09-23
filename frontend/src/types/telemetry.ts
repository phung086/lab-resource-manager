export type TelemetryState = "HEALTHY" | "WARNING" | "STALE" | "UNAVAILABLE" | "NO_DATA";

export interface TelemetrySampleView {
  id: string;
  sourceId?: string | null;
  source: string;
  sampledAt: string;
  online: boolean;
  temperatureC: number | null;
  humidityPercent: number | null;
  cpuPercent?: number | null;
  gpuPercent?: number | null;
  gpuMemoryPercent?: number | null;
  ramPercent?: number | null;
  diskPercent?: number | null;
  signals?: Array<{
    code: string;
    severity: string;
    message: string;
    verified: boolean;
    provenance: string;
  }>;
}

export interface TelemetrySourceHealth {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  reportedOnline: boolean | null;
  lastSeenAt: string | null;
  lastSampleAt: string | null;
  freshness: "FRESH" | "STALE" | "NO_DATA";
}

export interface MonitoringAlertView {
  id: string;
  sourceId: string;
  sourceCode?: string;
  resourceId: string;
  resourceCode?: string;
  laboratoryId: string;
  sampleId: string;
  ruleCode: string;
  severity: "WARNING" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  message: string;
  observedValue?: number | null;
  openedAt: string;
  lastObservedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: { id: string; fullName: string; role: string } | null;
  incident?: { id: string; severity: string; status: string; category?: string | null } | null;
}

export interface CameraMetadataView {
  id: string;
  code: string;
  name: string;
  laboratoryId: string;
  resourceId: string;
  enabled: boolean;
  state: "NOT_CONFIGURED" | "UNAVAILABLE" | "AVAILABLE";
  hasEndpoint: boolean;
  updatedAt: string;
}

export interface TelemetryResourceView {
  resource: {
    id: string;
    code: string;
    name: string;
    laboratoryId?: string | null;
    operationalStatus: string;
    specs?: Record<string, unknown>;
  };
  sourceHealth: TelemetrySourceHealth | null;
  latestTelemetry: TelemetrySampleView | null;
  history?: TelemetrySampleView[];
  thresholds: {
    values: Record<string, number>;
    sourceByField: Record<string, "RESOURCE_OVERRIDE" | "LABORATORY" | "SYSTEM_DEFAULT">;
  };
  monitoring: {
    state: TelemetryState;
    reasons: string[];
    staleMinutes?: number;
  };
  activeAlerts: MonitoringAlertView[];
}

export interface DashboardPayload {
  generatedAt: string;
  summary: {
    totalResources: number;
    resourcesByOperationalStatus: Record<string, number>;
    activeBookingsCount: number;
    pendingApprovalCount: number;
    checkedOutCount: number;
    openIncidentCount: number;
    criticalIncidentCount: number;
    unreadNotifications: number;
    activeMonitoringAlertCount: number;
    acknowledgedMonitoringAlertCount: number;
  };
  utilization: {
    windowDays: number;
    scheduledMinutes: number;
    actualUsageMinutes: number;
    scheduledUtilizationRate: number;
    actualUtilizationRate: number;
    source: "database";
  };
  incidents: {
    total: number;
    open: number;
    bySeverity: Record<string, number>;
  };
  telemetrySummary: Record<TelemetryState, number>;
  telemetry: TelemetryResourceView[];
  monitoringAlerts: MonitoringAlertView[];
  cameras: CameraMetadataView[];
  upcomingBookings: any[];
}
