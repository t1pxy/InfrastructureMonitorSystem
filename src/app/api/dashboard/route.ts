import { NextResponse } from "next/server";

import { getHardwareList } from "@/lib/hardware/query";
import type { Hardware } from "@/types/hardware";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function average(values: Array<number | null>): number | null {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function buildSummary(devices: Hardware[]) {
  return {
    total: devices.length,
    healthy: devices.filter((device) => device.status === "HEALTHY").length,
    warning: devices.filter((device) => device.status === "WARNING").length,
    critical: devices.filter((device) => device.status === "CRITICAL").length,
    offline: devices.filter((device) => device.status === "OFFLINE").length,
    unknown: devices.filter((device) => device.status === "UNKNOWN").length,
    online: devices.filter((device) => device.status !== "OFFLINE").length,
    desktop: devices.filter((device) => device.deviceClass === "DESKTOP").length,
    notebook: devices.filter((device) => device.deviceClass === "NOTEBOOK").length,
  };
}

function buildWindowsSummary(devices: Hardware[]) {
  return {
    total: devices.length,
    current: devices.filter((device) => device.windowsUpdate === "CURRENT").length,
    updateAvailable: devices.filter(
      (device) => device.windowsUpdate === "UPDATE_AVAILABLE",
    ).length,
    unsupported: devices.filter(
      (device) => device.windowsUpdate === "UNSUPPORTED_VERSION",
    ).length,
    unknown: devices.filter((device) => device.windowsUpdate === "UNKNOWN").length,
  };
}

function buildResourceSummary(devices: Hardware[]) {
  return {
    averageCpu: average(devices.map((device) => device.cpu)),
    averageMemory: average(devices.map((device) => device.memory)),
    averageDisk: average(devices.map((device) => device.disk)),
  };
}

function buildProblemDevices(devices: Hardware[]) {
  const severity: Record<Hardware["status"], number> = {
    CRITICAL: 5,
    OFFLINE: 4,
    WARNING: 3,
    UNKNOWN: 1,
    HEALTHY: 0,
  };

  return [...devices]
    .filter((device) => device.status !== "HEALTHY")
    .sort(
      (a, b) =>
        severity[b.status] - severity[a.status] ||
        a.hostname.localeCompare(b.hostname),
    )
    .slice(0, 8);
}

export async function GET() {
  try {
    const devices = await getHardwareList({
      type: "ALL",
      search: "",
    });

    const summary = buildSummary(devices);
    const windows = buildWindowsSummary(devices);
    const resources = buildResourceSummary(devices);
    const problemDevices = buildProblemDevices(devices);

    return NextResponse.json(
      {
        success: true,
        generatedOn: new Date().toISOString(),
        summary,
        windows,
        resources,
        problemDevices,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/dashboard] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data.",
      },
      {
        status: 500,
      },
    );
  }
}
