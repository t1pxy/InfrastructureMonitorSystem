import sql from "mssql";

import { getDb } from "@/lib/db";
import { DEVICE_SOURCE } from "@/lib/hardware/schema";

import type {
  UpdateInventoryState,
  WindowsUpdateDevice,
  WindowsUpdateRecord,
  WindowsUpdateSummary,
} from "@/types/windows-update";

interface DeviceUpdateRow {
  agentId: string;
  hostname: string;
  deviceClass: string;
  windowsVersion: string | null;

  updateCount: number;

  latestUpdateId: string | null;
  latestUpdateDate: Date | string | null;

  daysSinceLatestUpdate: number | null;
}

interface UpdateRecordRow {
  AgentID: string;
  UpdateID: string;

  ParentDisplayName: string | null;
  Publisher: string | null;

  InstallDate: Date | string | null;

  MoreinfoURL: string | null;

  SPInEffect: string | null;

  InstallState: number | null;

  Uninstall: string | null;

  Uninstallable: string | null;
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const valueText = String(value).trim();

  return valueText.length > 0 ? valueText : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
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

function getInventoryState(
  updateCount: number,
  latestUpdateDate: string | null,
): UpdateInventoryState {
  if (updateCount > 0 && latestUpdateDate) {
    return "RECORDED";
  }

  return "UNKNOWN";
}

function mapDevice(row: DeviceUpdateRow): WindowsUpdateDevice {
  const latestUpdateDate = toIso(row.latestUpdateDate);

  const updateCount = Number(row.updateCount ?? 0);

  return {
    agentId: row.agentId,

    hostname: toStringValue(row.hostname) ?? row.agentId,

    deviceClass: row.deviceClass === "NOTEBOOK" ? "NOTEBOOK" : "DESKTOP",

    windowsVersion: toStringValue(row.windowsVersion),

    updateCount,

    latestUpdateId: toStringValue(row.latestUpdateId),

    latestUpdateDate,

    daysSinceLatestUpdate: toNumber(row.daysSinceLatestUpdate),

    inventoryState: getInventoryState(updateCount, latestUpdateDate),
  };
}

function mapUpdate(row: UpdateRecordRow): WindowsUpdateRecord {
  return {
    agentId: row.AgentID,

    updateId: row.UpdateID,

    parentDisplayName: toStringValue(row.ParentDisplayName),

    publisher: toStringValue(row.Publisher),

    installDate: toIso(row.InstallDate),

    moreInfoUrl: toStringValue(row.MoreinfoURL),

    spInEffect: toStringValue(row.SPInEffect),

    installState: toNumber(row.InstallState),

    uninstall: toStringValue(row.Uninstall),

    uninstallable: toStringValue(row.Uninstallable),
  };
}

export async function getWindowsUpdateDevices(
  search = "",
): Promise<WindowsUpdateDevice[]> {
  const db = await getDb();

  const request = db.request();

  const conditions: string[] = [];

  conditions.push(`
    d.deviceClass IN (
      'DESKTOP',
      'NOTEBOOK'
    )
  `);

  if (search.trim()) {
    request.input("search", sql.NVarChar(200), `%${search.trim()}%`);

    conditions.push(`
      (
        d.hostname LIKE @search
        OR d.agentId LIKE @search
        OR d.windowsVersion LIKE @search
        OR d.location LIKE @search
      )
    `);
  }

  const where = conditions.length ? `WHERE ${conditions.join("\nAND ")}` : "";

  const result = await request.query(`
      SELECT
        d.agentId,
        d.hostname,
        d.deviceClass,
        d.windowsVersion,

        COUNT(u.UpdateID) AS updateCount,

        latest.UpdateID AS latestUpdateId,
        latest.InstallDate AS latestUpdateDate,

        CASE
          WHEN latest.InstallDate IS NULL
            THEN NULL

          ELSE DATEDIFF(
            DAY,
            latest.InstallDate,
            GETDATE()
          )
        END AS daysSinceLatestUpdate

      FROM (
        ${DEVICE_SOURCE}
      ) AS d

      LEFT JOIN TB_INV_UPDATES u
        ON u.AgentID = d.agentId

      OUTER APPLY (
        SELECT TOP 1
          x.UpdateID,
          x.InstallDate

        FROM TB_INV_UPDATES x

        WHERE x.AgentID =
          d.agentId

        ORDER BY
          CASE
            WHEN x.InstallDate IS NULL
              THEN 1
            ELSE 0
          END,

          x.InstallDate DESC,

          x.UpdateID DESC
      ) latest

      ${where}

      GROUP BY
        d.agentId,
        d.hostname,
        d.deviceClass,
        d.windowsVersion,

        latest.UpdateID,
        latest.InstallDate

      ORDER BY
        CASE
          WHEN latest.InstallDate IS NULL
            THEN 1
          ELSE 0
        END,

        latest.InstallDate DESC,

        d.hostname ASC
    `);

  return (result.recordset as DeviceUpdateRow[]).map(mapDevice);
}

export async function getWindowsUpdateSummary(): Promise<WindowsUpdateSummary> {
  const db = await getDb();

  const result = await db.request().query(`
      WITH devices AS (
        SELECT
          d.agentId
        FROM (
          ${DEVICE_SOURCE}
        ) AS d

        WHERE
          d.deviceClass IN (
            'DESKTOP',
            'NOTEBOOK'
          )
      ),

      update_summary AS (
        SELECT
          u.AgentID,

          COUNT(*) AS updateCount,

          MAX(u.InstallDate) AS latestUpdateDate

        FROM TB_INV_UPDATES u

        GROUP BY
          u.AgentID
      )

      SELECT
        (
          SELECT COUNT(*)
          FROM devices
        ) AS totalDevices,

        (
          SELECT COUNT(*)
          FROM devices d
          JOIN update_summary u
            ON u.AgentID =
              d.agentId
        ) AS devicesWithUpdates,

        (
          SELECT COUNT(*)
          FROM devices d
          LEFT JOIN update_summary u
            ON u.AgentID =
              d.agentId
          WHERE u.AgentID IS NULL
        ) AS devicesWithoutUpdates,

        (
          SELECT COUNT(*)
          FROM TB_INV_UPDATES u
          JOIN devices d
            ON d.agentId =
              u.AgentID
        ) AS totalUpdateRecords,

        (
          SELECT COUNT(*)
          FROM update_summary u
          JOIN devices d
            ON d.agentId =
              u.AgentID
          WHERE
            u.latestUpdateDate IS NOT NULL

            AND DATEDIFF(
              DAY,
              u.latestUpdateDate,
              GETDATE()
            ) > 30
        ) AS staleInventory,

        (
          SELECT MAX(
            u.latestUpdateDate
          )
          FROM update_summary u
          JOIN devices d
            ON d.agentId =
              u.AgentID
        ) AS latestUpdateDate
    `);

  const row = result.recordset[0] ?? {};

  return {
    totalDevices: Number(row.totalDevices ?? 0),

    devicesWithUpdates: Number(row.devicesWithUpdates ?? 0),

    devicesWithoutUpdates: Number(row.devicesWithoutUpdates ?? 0),

    totalUpdateRecords: Number(row.totalUpdateRecords ?? 0),

    staleInventory: Number(row.staleInventory ?? 0),

    latestUpdateDate: toIso(row.latestUpdateDate),
  };
}

export async function getWindowsUpdateDetail(
  agentId: string,
  limit = 100,
): Promise<{
  device: WindowsUpdateDevice | null;
  updates: WindowsUpdateRecord[];
}> {
  const db = await getDb();

  const request = db.request();

  request.input("agentId", sql.NVarChar(40), agentId);

  request.input(
    "limit",
    sql.Int,
    Math.max(1, Math.min(500, Math.floor(limit))),
  );

  const deviceResult = await request.query(`
      SELECT
        d.agentId,
        d.hostname,
        d.deviceClass,
        d.windowsVersion,

        COUNT(u.UpdateID) AS updateCount,

        latest.UpdateID AS latestUpdateId,
        latest.InstallDate AS latestUpdateDate,

        CASE
          WHEN latest.InstallDate IS NULL
            THEN NULL

          ELSE DATEDIFF(
            DAY,
            latest.InstallDate,
            GETDATE()
          )
        END AS daysSinceLatestUpdate

      FROM (
        ${DEVICE_SOURCE}
      ) AS d

      LEFT JOIN TB_INV_UPDATES u
        ON u.AgentID =
          d.agentId

      OUTER APPLY (
        SELECT TOP 1
          x.UpdateID,
          x.InstallDate

        FROM TB_INV_UPDATES x

        WHERE x.AgentID =
          d.agentId

        ORDER BY
          CASE
            WHEN x.InstallDate IS NULL
              THEN 1
            ELSE 0
          END,

          x.InstallDate DESC,

          x.UpdateID DESC
      ) latest

      WHERE
        d.agentId = @agentId

      GROUP BY
        d.agentId,
        d.hostname,
        d.deviceClass,
        d.windowsVersion,

        latest.UpdateID,
        latest.InstallDate
    `);

  const deviceRow = deviceResult.recordset[0] as DeviceUpdateRow | undefined;

  const device = deviceRow ? mapDevice(deviceRow) : null;

  if (!device) {
    return {
      device: null,
      updates: [],
    };
  }

  const updateResult = await db
    .request()
    .input("agentId", sql.NVarChar(40), agentId)
    .input("limit", sql.Int, Math.max(1, Math.min(500, Math.floor(limit))))
    .query(`
        SELECT TOP (@limit)
          AgentID,
          UpdateID,
          ParentDisplayName,
          Publisher,
          InstallDate,
          MoreinfoURL,
          SPInEffect,
          InstallState,
          Uninstall,
          Uninstallable

        FROM TB_INV_UPDATES

        WHERE
          AgentID = @agentId

        ORDER BY
          CASE
            WHEN InstallDate IS NULL
              THEN 1
            ELSE 0
          END,

          InstallDate DESC,

          UpdateID DESC
      `);

  const updates = (updateResult.recordset as UpdateRecordRow[]).map(mapUpdate);

  return {
    device,
    updates,
  };
}
