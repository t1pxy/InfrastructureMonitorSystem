import { NextResponse } from "next/server";
import sql from "mssql";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const valueString = String(value).trim();

  return valueString.length > 0 ? valueString : null;
}

function bytesToGb(value: unknown): number | null {
  const number = toNumber(value);

  if (number === null || number <= 0) {
    return null;
  }

  return number / 1024 / 1024 / 1024;
}

function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const agentId = decodeURIComponent(id).trim();

    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Agent ID is required.",
        },
        { status: 400 },
      );
    }

    const db = await getDb();

    const query = db.request();

    query.input("agentId", sql.NVarChar(100), agentId);

    const result = await query.batch(`
    SELECT
      CPUName AS name
    FROM TB_INV_WMICPU
    WHERE AgentID = @agentId
    ORDER BY CPUName;

    SELECT
      DeviceLocator,
      Speed,
      Capacity
    FROM TB_INV_WMIMEMORY
    WHERE AgentID = @agentId
    ORDER BY DeviceLocator;

    SELECT
      id,
      Drive,
      Label,
      SerialNumber,
      MountPoint,
      Capacity,
      FreeSpace
    FROM TB_INV_DISK
    WHERE AgentID = @agentId
    ORDER BY id;

    SELECT
      id,
      NetworkName,
      MACAddress,
      NetType,
      IPAddress,
      SubNetMask,
      Gateway,
      DHCP
    FROM TB_INV_NETWORK
    WHERE AgentID = @agentId
    ORDER BY id;

    SELECT TOP 1
      Platform,
      Version,
      VersionFull,
      Build,
      UBR,
      ServicePack,
      ProductType,
      LanguageName,
      Country,
      InstallDate,
      Windows_Folder,
      System_Folder
    FROM TB_INV_OS
    WHERE AgentID = @agentId;

    SELECT TOP 1
      Manufacturer,
      Model,
      Serial
    FROM TB_INV_MAINBOARD
    WHERE AgentID = @agentId;

    SELECT TOP 1
      Manufacturer,
      Model,
      Version,
      Serial
    FROM TB_INV_SYSTEM
    WHERE AgentID = @agentId;

    SELECT
      DeviceName,
      SerialNumber,
      EquipmentTypeID,
      Description
    FROM TB_EQUIPMENT
    WHERE AgentID = @agentId
    ORDER BY DeviceName;
  `);

    const recordsets = result.recordsets as unknown as Array<
      Array<Record<string, unknown>>
    >;

    const cpuRows = (recordsets[0] ?? []) as Array<{
      name: unknown;
    }>;

    const memoryRows = (recordsets[1] ?? []) as Array<{
      DeviceLocator: unknown;
      Speed: unknown;
      Capacity: unknown;
    }>;

    const diskRows = (recordsets[2] ?? []) as Array<{
      id: unknown;
      Drive: unknown;
      Label: unknown;
      SerialNumber: unknown;
      MountPoint: unknown;
      Capacity: unknown;
      FreeSpace: unknown;
    }>;

    const networkRows = (recordsets[3] ?? []) as Array<{
      id: unknown;
      NetworkName: unknown;
      MACAddress: unknown;
      NetType: unknown;
      IPAddress: unknown;
      SubNetMask: unknown;
      Gateway: unknown;
      DHCP: unknown;
    }>;

    const osRow = (recordsets[4] ?? [])[0] as
      | {
          Platform: unknown;
          Version: unknown;
          VersionFull: unknown;
          Build: unknown;
          UBR: unknown;
          ServicePack: unknown;
          ProductType: unknown;
          LanguageName: unknown;
          Country: unknown;
          InstallDate: unknown;
          Windows_Folder: unknown;
          System_Folder: unknown;
        }
      | undefined;

    const mainboardRow = (recordsets[5] ?? [])[0] as
      | {
          Manufacturer: unknown;
          Model: unknown;
          Serial: unknown;
        }
      | undefined;

    const systemRow = (recordsets[6] ?? [])[0] as
      | {
          Manufacturer: unknown;
          Model: unknown;
          Version: unknown;
          Serial: unknown;
        }
      | undefined;

    const equipmentRows = (recordsets[7] ?? []) as Array<{
      DeviceName: unknown;
      SerialNumber: unknown;
      EquipmentTypeID: unknown;
      Description: unknown;
    }>;

    const memory = memoryRows.map((row) => ({
      deviceLocator: toStringValue(row.DeviceLocator),

      speed: toNumber(row.Speed),

      capacityGb: bytesToGb(row.Capacity),
    }));

    const disks = diskRows.map((row) => {
      const capacityGb = bytesToGb(row.Capacity);

      const freeSpaceGb = bytesToGb(row.FreeSpace);

      const usedPercent =
        capacityGb !== null && freeSpaceGb !== null && capacityGb > 0
          ? Math.max(
              0,
              Math.min(100, ((capacityGb - freeSpaceGb) / capacityGb) * 100),
            )
          : null;

      return {
        id: row.id ?? null,

        drive: toStringValue(row.Drive),

        label: toStringValue(row.Label),

        serialNumber: toStringValue(row.SerialNumber),

        mountPoint: toStringValue(row.MountPoint),

        capacityGb,

        freeSpaceGb,

        usedPercent,
      };
    });

    const os = osRow
      ? {
          platform: toStringValue(osRow.Platform),

          version: toStringValue(osRow.Version),

          versionFull: toStringValue(osRow.VersionFull),

          build: toStringValue(osRow.Build),

          ubr: toNumber(osRow.UBR),

          servicePack: toStringValue(osRow.ServicePack),

          productType: toStringValue(osRow.ProductType),

          languageName: toStringValue(osRow.LanguageName),

          country: toStringValue(osRow.Country),

          installDate: toIso(osRow.InstallDate),

          windowsFolder: toStringValue(osRow.Windows_Folder),

          systemFolder: toStringValue(osRow.System_Folder),
        }
      : null;

    const data = {
      cpu: cpuRows.map((row) => ({
        name: toStringValue(row.name),
      })),

      memory,

      disks,

      network: networkRows.map((row) => ({
        id: row.id ?? null,

        networkName: toStringValue(row.NetworkName),

        macAddress: toStringValue(row.MACAddress),

        netType: toStringValue(row.NetType),

        ipAddress: toStringValue(row.IPAddress),

        subnetMask: toStringValue(row.SubNetMask),

        gateway: toStringValue(row.Gateway),

        dhcp: toStringValue(row.DHCP),
      })),

      os,

      mainboard: mainboardRow
        ? {
            manufacturer: toStringValue(mainboardRow.Manufacturer),

            model: toStringValue(mainboardRow.Model),

            serial: toStringValue(mainboardRow.Serial),
          }
        : null,

      system: systemRow
        ? {
            manufacturer: toStringValue(systemRow.Manufacturer),

            model: toStringValue(systemRow.Model),

            version: toStringValue(systemRow.Version),

            serial: toStringValue(systemRow.Serial),
          }
        : null,

      equipment: equipmentRows.map((row) => ({
        deviceName: toStringValue(row.DeviceName),

        serialNumber: toStringValue(row.SerialNumber),

        equipmentTypeId: row.EquipmentTypeID ?? null,

        description: toStringValue(row.Description),
      })),
    };

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/hardware/[id]/inventory]", error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load hardware inventory.",
      },
      {
        status: 500,
      },
    );
  }
}
