export type HardwareDeviceType =
  | "ALL"
  | "DESKTOP"
  | "NOTEBOOK";

export type HardwareStatus =
  | "HEALTHY"
  | "WARNING"
  | "CRITICAL"
  | "OFFLINE"
  | "UNKNOWN";

export type WindowsUpdateStatus =
  | "CURRENT"
  | "UPDATE_AVAILABLE"
  | "UNSUPPORTED_VERSION"
  | "UNKNOWN";

export interface Hardware {
  id: string;
  hostname: string;

  deviceClass:
    | "DESKTOP"
    | "NOTEBOOK";

  ipAddress: string | null;

  user: string;
  department: string;
  location: string | null;

  cpu: number | null;
  cpuName: string | null;

  memory: number | null;
  memoryUsedGb: number | null;
  memoryTotalGb: number | null;

  disk: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;

  windowsVersion: string | null;
  windowsBuild: string | null;
  windowsUpdate: WindowsUpdateStatus;

  lastContact: string | null;

  performanceAt: string | null;
  performanceAgeSeconds: number | null;

  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;

  agentVersion: string | null;

  status: HardwareStatus;
}

export interface HardwareSummary {
  total: number;

  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  unknown: number;

  updatePending: number;

  desktop: number;
  notebook: number;
}

export interface HardwareListResponse {
  success: boolean;
  data: Hardware[];
  count: number;
  type: HardwareDeviceType;
  error?: string;
}

export interface HardwareSummaryResponse {
  success: boolean;
  data: HardwareSummary;
  type: HardwareDeviceType;
  error?: string;
}

export interface HardwarePerformancePoint {
  recordedAt: string;

  cpu: number | null;

  memory: number | null;
  memoryUsedGb: number | null;
  memoryTotalGb: number | null;

  disk: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;
}

export interface HardwarePerformanceResponse {
  success: boolean;

  data: HardwarePerformancePoint[];

  latest: HardwarePerformancePoint | null;

  error?: string;
}
