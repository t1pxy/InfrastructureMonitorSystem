export type HardwareDeviceType = "ALL" | "DESKTOP" | "NOTEBOOK";

export type HardwareStatus =
  "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE" | "UNKNOWN";

export type WindowsUpdateStatus =
  "CURRENT" | "UPDATE_AVAILABLE" | "UNSUPPORTED_VERSION" | "UNKNOWN";

export interface Hardware {
  id: string;
  hostname: string;

  deviceClass: "DESKTOP" | "NOTEBOOK";

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

export interface HardwareCpuInventory {
  name: string | null;
}

export interface HardwareMemoryInventory {
  deviceLocator: string | null;
  speed: number | null;
  capacityGb: number | null;
}

export interface HardwareDiskInventory {
  id: number | string | null;
  drive: string | null;
  label: string | null;
  serialNumber: string | null;
  mountPoint: string | null;
  capacityGb: number | null;
  freeSpaceGb: number | null;
  usedPercent: number | null;
}

export interface HardwareNetworkInventory {
  id: number | string | null;
  networkName: string | null;
  macAddress: string | null;
  netType: string | null;
  ipAddress: string | null;
  subnetMask: string | null;
  gateway: string | null;
  dhcp: string | null;
}

export interface HardwareOsInventory {
  platform: string | null;
  version: string | null;
  versionFull: string | null;
  build: string | null;
  ubr: number | null;
  servicePack: string | null;
  productType: string | null;
  languageName: string | null;
  country: string | null;
  installDate: string | null;
  windowsFolder: string | null;
  systemFolder: string | null;
}

export interface HardwareMainboardInventory {
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
}

export interface HardwareSystemInventory {
  manufacturer: string | null;
  model: string | null;
  version: string | null;
  serial: string | null;
}

export interface HardwareEquipmentInventory {
  deviceName: string | null;
  serialNumber: string | null;
  equipmentTypeId: number | string | null;
  description: string | null;
}

export interface HardwareInventory {
  cpu: HardwareCpuInventory[];
  memory: HardwareMemoryInventory[];
  disks: HardwareDiskInventory[];
  network: HardwareNetworkInventory[];
  os: HardwareOsInventory | null;
  mainboard: HardwareMainboardInventory | null;
  system: HardwareSystemInventory | null;
  equipment: HardwareEquipmentInventory[];
}

export interface HardwareInventoryResponse {
  success: boolean;
  data: HardwareInventory | null;
  error?: string;
}
