import sql from "mssql";

import { getDb } from "@/lib/db";

import type {
  Hardware,
  HardwareDeviceType,
  HardwareStatus,
  HardwareSummary,
  WindowsUpdateStatus,
} from "@/types/hardware";

import { DEVICE_SOURCE } from "./schema";

const RECENT_MONITOR_ROWS = 100000;

interface HardwareSourceRow {
  agentId: string | null;
  hostname: string | null;
  deviceClass: string | null;

  ipAddress: string | null;

  user: string | null;
  department: string | null;
  location: string | null;

  online: boolean | number | string | null;

  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  agentVersion: string | null;

  windowsVersion: string | null;
  windowsBuild: string | null;

  memoryTotalGb: number | null;
  diskTotalGb: number | null;

  cpuName: string | null;

  lastSeen: Date | string | null;
  lastSoftwareUpdate: Date | string | null;
  lastBoot: Date | string | null;

  monitorCpu: number | null;
  monitorTotalMem: number | null;
  monitorAvailableMem: number | null;
  monitorCurrentTime: Date | string | null;

  diskTotalBytes: number | string | null;
  diskFreeBytes: number | string | null;
}

function toStringValue(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const result = String(value).trim();

  return result.length > 0 ? result : null;
}

function toNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function toBoolean(
  value: unknown,
): boolean {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }

  if (typeof value === "string") {
    return (
      value.toLowerCase() === "true" ||
      value === "1"
    );
  }

  return false;
}

function toIso(
  value: unknown,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(String(value));

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date.toISOString();
}

function clampPercent(
  value: number | null,
): number | null {
  if (value === null) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, value),
  );
}

/**
 * StarCat memory fields are not guaranteed to use
 * the same unit across every collector/version.
 *
 * Supported heuristics:
 * - bytes
 * - KB
 * - MB
 * - GB
 */
function memoryToGb(
  value: unknown,
): number | null {
  const number = toNumber(value);

  if (
    number === null ||
    number <= 0
  ) {
    return null;
  }

  if (number >= 40_000_000_000) {
    return number / 1024 / 1024 / 1024;
  }

  if (number >= 4_000_000) {
    return number / 1024 / 1024;
  }

  if (number >= 4_096) {
    return number / 1024;
  }

  return number;
}

function bytesToGb(
  value: unknown,
): number | null {
  const number = toNumber(value);

  if (
    number === null ||
    number <= 0
  ) {
    return null;
  }

  return number / 1024 / 1024 / 1024;
}

function calculateStatus({
  online,
  cpu,
  memory,
  disk,
  performanceAt,
}: {
  online: boolean;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  performanceAt: string | null;
}): HardwareStatus {
  if (!online) {
    return "OFFLINE";
  }

  if (
    !performanceAt &&
    cpu === null &&
    memory === null &&
    disk === null
  ) {
    return "UNKNOWN";
  }

  const metrics = [
    cpu,
    memory,
    disk,
  ].filter(
    (value): value is number =>
      value !== null,
  );

  if (metrics.length === 0) {
    return "UNKNOWN";
  }

  if (
    metrics.some(
      (value) => value >= 90,
    )
  ) {
    return "CRITICAL";
  }

  if (
    metrics.some(
      (value) => value >= 80,
    )
  ) {
    return "WARNING";
  }

  return "HEALTHY";
}

function calculatePerformanceAge(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) /
        1000,
    ),
  );
}

function mapRow(
  row: HardwareSourceRow,
): Hardware {
  const id =
    toStringValue(row.agentId) ??
    toStringValue(row.hostname) ??
    "unknown";

  const hostname =
    toStringValue(row.hostname) ??
    id;

  const online =
    toBoolean(row.online);

  const performanceAt =
    toIso(row.monitorCurrentTime);

  const cpu =
    clampPercent(
      toNumber(row.monitorCpu),
    );

  const historyTotalMemoryGb =
    memoryToGb(
      row.monitorTotalMem,
    );

  const historyAvailableMemoryGb =
    memoryToGb(
      row.monitorAvailableMem,
    );

  const memoryTotalGb =
    historyTotalMemoryGb ??
    toNumber(row.memoryTotalGb);

  const memoryUsedGb =
    memoryTotalGb !== null &&
    historyAvailableMemoryGb !== null
      ? Math.max(
          0,
          memoryTotalGb -
            historyAvailableMemoryGb,
        )
      : null;

  const memory =
    memoryTotalGb !== null &&
    memoryUsedGb !== null &&
    memoryTotalGb > 0
      ? clampPercent(
          (memoryUsedGb /
            memoryTotalGb) *
            100,
        )
      : null;

  const diskTotalGb =
    bytesToGb(
      row.diskTotalBytes,
    ) ??
    toNumber(row.diskTotalGb);

  const diskFreeGb =
    bytesToGb(
      row.diskFreeBytes,
    );

  const diskUsedGb =
    diskTotalGb !== null &&
    diskFreeGb !== null
      ? Math.max(
          0,
          diskTotalGb -
            diskFreeGb,
        )
      : null;

  const disk =
    diskTotalGb !== null &&
    diskUsedGb !== null &&
    diskTotalGb > 0
      ? clampPercent(
          (diskUsedGb /
            diskTotalGb) *
            100,
        )
      : null;

  const status =
    calculateStatus({
      online,
      cpu,
      memory,
      disk,
      performanceAt,
    });

  const deviceClass =
    row.deviceClass ===
    "NOTEBOOK"
      ? "NOTEBOOK"
      : "DESKTOP";

  const windowsUpdate: WindowsUpdateStatus =
    "UNKNOWN";

  return {
    id,
    hostname,

    deviceClass,

    ipAddress:
      toStringValue(
        row.ipAddress,
      ),

    user:
      toStringValue(row.user) ??
      "-",

    department:
      toStringValue(
        row.department,
      ) ?? "-",

    location:
      toStringValue(
        row.location,
      ),

    cpu,

    cpuName:
      toStringValue(
        row.cpuName,
      ),

    memory,

    memoryUsedGb,

    memoryTotalGb,

    disk,

    diskUsedGb,

    diskTotalGb,

    windowsVersion:
      toStringValue(
        row.windowsVersion,
      ),

    windowsBuild:
      toStringValue(
        row.windowsBuild,
      ),

    windowsUpdate,

    lastContact:
      toIso(row.lastSeen),

    performanceAt,

    performanceAgeSeconds:
      calculatePerformanceAge(
        performanceAt,
      ),

    manufacturer:
      toStringValue(
        row.manufacturer,
      ),

    model:
      toStringValue(row.model),

    serialNumber:
      toStringValue(
        row.serialNumber,
      ),

    agentVersion:
      toStringValue(
        row.agentVersion,
      ),

    status,
  };
}

function addFilters(
  request: sql.Request,
  type: HardwareDeviceType,
  search: string,
): string {
  const conditions: string[] = [];

  conditions.push(`
    dev.deviceClass IN (
      'DESKTOP',
      'NOTEBOOK'
    )
  `);

  if (type === "DESKTOP") {
    conditions.push(`
      dev.deviceClass = 'DESKTOP'
    `);
  }

  if (type === "NOTEBOOK") {
    conditions.push(`
      dev.deviceClass = 'NOTEBOOK'
    `);
  }

  if (search.trim()) {
    conditions.push(`
      (
        dev.hostname LIKE @search
        OR dev.ipAddress LIKE @search
        OR dev.[user] LIKE @search
        OR dev.department LIKE @search
        OR dev.location LIKE @search
        OR dev.manufacturer LIKE @search
        OR dev.model LIKE @search
        OR dev.serialNumber LIKE @search
      )
    `);

    request.input(
      "search",
      sql.NVarChar(200),
      `%${search.trim()}%`,
    );
  }

  return conditions.length
    ? `WHERE ${conditions.join(
        "\nAND ",
      )}`
    : "";
}

function hardwareQuery(
  filter: string,
): string {
  return `
    WITH recent_monitor AS (
      SELECT TOP (${RECENT_MONITOR_ROWS})
        mh.ID,
        mh.AgentID,
        mh.CPUUsage,
        mh.TotalMem,
        mh.AvailableMem,
        mh.CurrentTime
      FROM TB_MONITORHISTORY mh
      ORDER BY mh.ID DESC
    ),

    ranked_monitor AS (
      SELECT
        rm.*,
        ROW_NUMBER() OVER (
          PARTITION BY rm.AgentID
          ORDER BY
            rm.CurrentTime DESC,
            rm.ID DESC
        ) AS rn
      FROM recent_monitor rm
    )

    SELECT
      dev.*,

      monitor.CPUUsage AS monitorCpu,
      monitor.TotalMem AS monitorTotalMem,
      monitor.AvailableMem AS monitorAvailableMem,
      monitor.CurrentTime AS monitorCurrentTime,

      disk.diskTotalBytes,
      disk.diskFreeBytes

    FROM (
      ${DEVICE_SOURCE}
    ) AS dev

    LEFT JOIN ranked_monitor monitor
      ON monitor.AgentID =
        dev.agentId
      AND monitor.rn = 1

    OUTER APPLY (
      SELECT
        SUM(
          CAST(d.Capacity AS DECIMAL(38,2))
        ) AS diskTotalBytes,

        SUM(
          CAST(d.FreeSpace AS DECIMAL(38,2))
        ) AS diskFreeBytes

      FROM TB_INV_DISK d

      WHERE d.AgentID =
        dev.agentId
    ) disk

    ${filter}

    ORDER BY dev.hostname ASC
  `;
}

export async function getHardwareList(
  params?: {
    type?: HardwareDeviceType;
    search?: string;
  },
): Promise<Hardware[]> {
  const db = await getDb();

  const type =
    params?.type ?? "ALL";

  const search =
    params?.search ?? "";

  const request =
    db.request();

  const filter =
    addFilters(
      request,
      type,
      search,
    );

  const result =
    await request.query(
      hardwareQuery(filter),
    );

  return (
    result.recordset as HardwareSourceRow[]
  ).map(mapRow);
}

export async function getHardwareSummary(
  type: HardwareDeviceType = "ALL",
): Promise<HardwareSummary> {
  const rows =
    await getHardwareList({
      type,
      search: "",
    });

  return {
    total: rows.length,

    healthy: rows.filter(
      (row) =>
        row.status ===
        "HEALTHY",
    ).length,

    warning: rows.filter(
      (row) =>
        row.status ===
        "WARNING",
    ).length,

    critical: rows.filter(
      (row) =>
        row.status ===
        "CRITICAL",
    ).length,

    offline: rows.filter(
      (row) =>
        row.status ===
        "OFFLINE",
    ).length,

    unknown: rows.filter(
      (row) =>
        row.status ===
        "UNKNOWN",
    ).length,

    updatePending: rows.filter(
      (row) =>
        row.windowsUpdate ===
          "PENDING" ||
        row.windowsUpdate ===
          "FAILED" ||
        row.windowsUpdate ===
          "REBOOT_REQUIRED",
    ).length,

    desktop: rows.filter(
      (row) =>
        row.deviceClass ===
        "DESKTOP",
    ).length,

    notebook: rows.filter(
      (row) =>
        row.deviceClass ===
        "NOTEBOOK",
    ).length,
  };
}

export async function getHardwareById(
  id: string,
): Promise<Hardware | null> {
  const db = await getDb();

  const request =
    db.request();

  request.input(
    "id",
    sql.NVarChar(100),
    id,
  );

  const result =
    await request.query(`
      WITH recent_monitor AS (
        SELECT TOP (${RECENT_MONITOR_ROWS})
          mh.ID,
          mh.AgentID,
          mh.CPUUsage,
          mh.TotalMem,
          mh.AvailableMem,
          mh.CurrentTime
        FROM TB_MONITORHISTORY mh
        ORDER BY mh.ID DESC
      ),

      ranked_monitor AS (
        SELECT
          rm.*,
          ROW_NUMBER() OVER (
            PARTITION BY rm.AgentID
            ORDER BY
              rm.CurrentTime DESC,
              rm.ID DESC
          ) AS rn
        FROM recent_monitor rm
      )

      SELECT TOP 1
        dev.*,

        monitor.CPUUsage AS monitorCpu,
        monitor.TotalMem AS monitorTotalMem,
        monitor.AvailableMem AS monitorAvailableMem,
        monitor.CurrentTime AS monitorCurrentTime,

        disk.diskTotalBytes,
        disk.diskFreeBytes

      FROM (
        ${DEVICE_SOURCE}
      ) AS dev

      LEFT JOIN ranked_monitor monitor
        ON monitor.AgentID =
          dev.agentId
        AND monitor.rn = 1

      OUTER APPLY (
        SELECT
          SUM(
            CAST(d.Capacity AS DECIMAL(38,2))
          ) AS diskTotalBytes,

          SUM(
            CAST(d.FreeSpace AS DECIMAL(38,2))
          ) AS diskFreeBytes

        FROM TB_INV_DISK d

        WHERE d.AgentID =
          dev.agentId
      ) disk

      WHERE
        dev.agentId = @id
        OR dev.hostname = @id
    `);

  const row =
    result.recordset[0] as
      | HardwareSourceRow
      | undefined;

  if (!row) {
    return null;
  }

  if (
    row.deviceClass !==
      "DESKTOP" &&
    row.deviceClass !==
      "NOTEBOOK"
  ) {
    return null;
  }

  return mapRow(row);
}