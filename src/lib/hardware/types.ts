export type HardwareStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE" | "UNKNOWN"
export type WindowsUpdateStatus = "LATEST" | "PENDING" | "FAILED" | "REBOOT_REQUIRED" | "UNKNOWN"

export interface Hardware {
  id: string,
  hostname: string,
  ipAddress: string | null,
  user: string,
  department: string,
  cpu: number | null,
  cpuName: string | null,
  memory: number | null,
  memoryUsedGb: number | null,
  memoryTotalGb: number | null,
  disk: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;
  windowsVersion: string;
  windowsBuild: string | null;
  windowsUpdate: WindowsUpdateStatus;
  lastContact: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  agentVersion: string | null;
  location: string | null;
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
}