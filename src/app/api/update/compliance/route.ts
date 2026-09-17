import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { DEVICE_SOURCE } from "@/lib/hardware/schema";
import {
  compareWindowsBuild,
  type WindowsComplianceStatus,
} from "@/lib/windows-update/compare";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawHardwareRow = {
  agentId: string | null;
  hostname: string | null;
  deviceClass: string | null;
  ipAddress: string | null;
  user: string | null;
  department: string | null;
  location: string | null;
  online: boolean | number | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  agentVersion: string | null;
  windowsVersion: string | null;
  windowsBuild: string | null;
  memoryTotalGb: number | null;
  diskTotalGb: number | null;
  lastBoot: Date | string | null;
  cpuName: string | null;
  lastSeen: Date | string | null;
};

type ComplianceDevice = {
  agentId: string | null;
  hostname: string;
  deviceClass: string | null;
  ipAddress: string | null;
  user: string | null;
  department: string | null;
  location: string | null;
  online: boolean;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  agentVersion: string | null;

  windowsVersion: string | null;
  windowsBuild: string | null;

  memoryTotalGb: number | null;
  diskTotalGb: number | null;
  lastBoot: string | null;
  cpuName: string | null;
  lastSeen: string | null;

  comparison: ReturnType<
    typeof compareWindowsBuild
  >;
};

function toIso(
  value: Date | string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function toBoolean(
  value: boolean | number | null | undefined,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return Number(value ?? 0) === 1;
}

function normaliseHostname(
  value: string | null | undefined,
): string {
  return String(value ?? "").trim();
}

function isManagedComputer(
  hostname: string,
): boolean {
  /*
   * User naming convention:
   *
   * 22RDT107
   * 22RNB025
   *
   * RDT = Desktop
   * RNB = Notebook
   */

  return (
    /^\d{2}RDT\d{3}$/i.test(hostname) ||
    /^\d{2}RNB\d{3}$/i.test(hostname)
  );
}

function isComplianceStatus(
  value: WindowsComplianceStatus,
): boolean {
  return (
    value === "CURRENT" ||
    value === "UPDATE_AVAILABLE" ||
    value === "UNSUPPORTED_VERSION" ||
    value === "UNKNOWN"
  );
}

export async function GET() {
  try {
    const db = await getDb();

    const result =
      await db
        .request()
        .query<RawHardwareRow>(`
          SELECT
            agentId,
            hostname,
            deviceClass,
            ipAddress,
            [user],
            department,
            location,
            online,
            manufacturer,
            model,
            serialNumber,
            agentVersion,
            windowsVersion,
            windowsBuild,
            memoryTotalGb,
            diskTotalGb,
            lastBoot,
            cpuName,
            lastSeen
          FROM (
            ${DEVICE_SOURCE}
          ) AS d
          WHERE
            UPPER(COALESCE(deviceClass, '')) = 'COMPUTER'
          ORDER BY
            hostname ASC;
        `);

    const devices: ComplianceDevice[] =
      result.recordset
        .map((row) => {
          const hostname =
            normaliseHostname(
              row.hostname,
            );

          if (!isManagedComputer(hostname)) {
            return null;
          }

          const comparison =
            compareWindowsBuild(
              row.windowsVersion,
              row.windowsBuild,
            );

          if (
            !isComplianceStatus(
              comparison.status,
            )
          ) {
            return null;
          }

          return {
            agentId: row.agentId,
            hostname,
            deviceClass: row.deviceClass,

            ipAddress:
              row.ipAddress ?? null,

            user: row.user ?? null,

            department:
              row.department ?? null,

            location:
              row.location ?? null,

            online: toBoolean(
              row.online,
            ),

            manufacturer:
              row.manufacturer ?? null,

            model:
              row.model ?? null,

            serialNumber:
              row.serialNumber ?? null,

            agentVersion:
              row.agentVersion ?? null,

            windowsVersion:
              row.windowsVersion ?? null,

            windowsBuild:
              row.windowsBuild ?? null,

            memoryTotalGb:
              row.memoryTotalGb == null
                ? null
                : Number(
                    row.memoryTotalGb,
                  ),

            diskTotalGb:
              row.diskTotalGb == null
                ? null
                : Number(
                    row.diskTotalGb,
                  ),

            lastBoot: toIso(
              row.lastBoot,
            ),

            cpuName:
              row.cpuName ?? null,

            lastSeen: toIso(
              row.lastSeen,
            ),

            comparison,
          };
        })
        .filter(
          (
            row,
          ): row is ComplianceDevice =>
            row !== null,
        );

    const summary = {
      total: devices.length,

      current: devices.filter(
        (device) =>
          device.comparison.status ===
          "CURRENT",
      ).length,

      updateAvailable:
        devices.filter(
          (device) =>
            device.comparison.status ===
            "UPDATE_AVAILABLE",
        ).length,

      unsupported:
        devices.filter(
          (device) =>
            device.comparison.status ===
            "UNSUPPORTED_VERSION",
        ).length,

      unknown: devices.filter(
        (device) =>
          device.comparison.status ===
          "UNKNOWN",
      ).length,
    };

    /*
     * Useful diagnostics for checking whether
     * the MSSQL side is actually providing
     * Windows Build information.
     */
    const dataQuality = {
      devicesWithWindowsVersion:
        devices.filter(
          (device) =>
            Boolean(
              device.windowsVersion,
            ),
        ).length,

      devicesWithWindowsBuild:
        devices.filter(
          (device) =>
            Boolean(
              device.windowsBuild,
            ),
        ).length,

      devicesWithCompleteWindowsBuild:
        devices.filter(
          (device) =>
            Boolean(
              device.windowsBuild?.includes(
                ".",
              ),
            ),
        ).length,
    };

    return NextResponse.json(
      {
        ok: true,

        summary,

        dataQuality,

        devices,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "[GET /api/update/compliance] failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load Windows compliance data.",
      },
      {
        status: 500,
      },
    );
  }
}