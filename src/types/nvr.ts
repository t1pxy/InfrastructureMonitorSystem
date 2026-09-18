export type NvrStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";
export type CameraStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

export interface NvrConfig {
  id: string;
  name: string;
  host: string;
  port?: number;
  username: string;
  password: string;
  site?: string;
}

export interface NvrCamera {
  id: string;
  channel: number | null;
  name: string;
  ipAddress: string | null;
  status: CameraStatus;
  lastChecked: string | null;
  offlineSince?: string | null;
  error?: string | null;
}

export interface NvrStorage {
  id: string;
  name: string;
  status: string;
  capacityGb: number | null;
  freeGb: number | null;
}

export interface Nvr {
  id: string;
  routeId: string;
  name: string;
  host: string;
  site: string | null;
  model: string | null;
  serialNumber: string | null;
  firmware: string | null;
  status: NvrStatus;
  lastChecked: string | null;
  cameraCount: number;
  onlineCameraCount: number;
  offlineCameraCount: number;
  storage: NvrStorage[];
  error?: string | null;
}

export interface NvrListResponse {
  success: boolean;
  data: Nvr[];
  count: number;
  error?: string;
}

export interface NvrDetailResponse {
  success: boolean;
  nvr: Nvr | null;
  cameras: NvrCamera[];
  error?: string;
}