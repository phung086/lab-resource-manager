export type TelemetryState = "HEALTHY" | "WARNING" | "STALE" | "UNAVAILABLE" | "NO_DATA";

export interface TelemetrySampleView {
  id: string;
  source: string;
  sampledAt: string;
  online: boolean;
  temperatureC: number;
  humidityPercent: number;
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

export interface TelemetryResourceView {
  resource: {
    id: string;
    code: string;
    name: string;
    laboratoryId?: string | null;
    operationalStatus: string;
    specs?: Record<string, unknown>;
  };
  latestTelemetry: TelemetrySampleView | null;
  monitoring: {
    state: TelemetryState;
    reasons: string[];
    staleMinutes?: number;
  };
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
  upcomingBookings: any[];
}
