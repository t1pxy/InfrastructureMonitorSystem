import { compareWindowsBuild, type WindowsUpdateComparison } from "@/lib/windows-update/compare";

export type HardwareForWindowsCompare = {
  id?: string | number | null;
  agentId?: string | null;
  hostname?: string | null;
  deviceClass?: string | null;
  ipAddress?: string | null;
  user?: string | null;
  department?: string | null;
  location?: string | null;
  online?: boolean | null;
  windowsVersion?: string | null;
  windowsBuild?: string | null;
};

export type WindowsFleetDevice = HardwareForWindowsCompare & {
  comparison: WindowsUpdateComparison;
};

export type WindowsFleetComparison = {
  total: number;
  current: number;
  updateAvailable: number;
  unsupported: number;
  unknown: number;
  devices: WindowsFleetDevice[];
};

export function compareHardwareFleet(
  devices: HardwareForWindowsCompare[],
): WindowsFleetComparison {
  const compared = devices.map((device) => ({
    ...device,
    comparison: compareWindowsBuild(
      device.windowsVersion,
      device.windowsBuild,
    ),
  }));

  return {
    total: compared.length,
    current: compared.filter((item) => item.comparison.status === "CURRENT").length,
    updateAvailable: compared.filter(
      (item) => item.comparison.status === "UPDATE_AVAILABLE",
    ).length,
    unsupported: compared.filter(
      (item) => item.comparison.status === "UNSUPPORTED_VERSION",
    ).length,
    unknown: compared.filter((item) => item.comparison.status === "UNKNOWN").length,
    devices: compared,
  };
}
