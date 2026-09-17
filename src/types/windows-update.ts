export type UpdateInventoryState =
  | "RECORDED"
  | "UNKNOWN"
  | "OTHER_STATE";

export interface WindowsUpdateDevice {
  agentId: string;
  hostname: string;
  deviceClass: "DESKTOP" | "NOTEBOOK";

  windowsVersion: string | null;

  updateCount: number;

  latestUpdateId: string | null;
  latestUpdateDate: string | null;

  daysSinceLatestUpdate: number | null;

  inventoryState: UpdateInventoryState;
}

export interface WindowsUpdateRecord {
  agentId: string;

  updateId: string;

  parentDisplayName: string | null;
  publisher: string | null;

  installDate: string | null;

  moreInfoUrl: string | null;

  spInEffect: string | null;

  installState: number | null;

  uninstall: string | null;
  uninstallable: string | null;
}

export interface WindowsUpdateSummary {
  totalDevices: number;

  devicesWithUpdates: number;

  devicesWithoutUpdates: number;

  totalUpdateRecords: number;

  staleInventory: number;

  latestUpdateDate: string | null;
}

export interface WindowsUpdateListResponse {
  success: boolean;

  data: WindowsUpdateDevice[];

  count: number;

  search: string;

  error?: string;
}

export interface WindowsUpdateSummaryResponse {
  success: boolean;

  data: WindowsUpdateSummary;

  error?: string;
}

export interface WindowsUpdateDetailResponse {
  success: boolean;

  data: {
    device: WindowsUpdateDevice | null;

    updates: WindowsUpdateRecord[];
  };

  error?: string;
}