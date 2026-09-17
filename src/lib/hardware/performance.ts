import sql from "mssql";

import { getDb } from "@/lib/db";
import { aggregatePerformance, getPerformanceBucket } from "@/lib/hardware/performance-aggregation";
import type { HardwarePerformancePoint } from "@/types/hardware";

const PERFORMANCE_SCAN_ROWS = 250000;

export type PerformanceRange = "1h" | "24h" | "7d" | "14d" | "30d";

interface PerformanceRow {
  ID: number;
  CPUUsage: number | null;
  TotalMem: number | null;
  AvailableMem: number | null;
  CurrentTime: Date | string;
  DiskTotalBytes: number | string | null;
  DiskFreeBytes: number | string | null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function clamp(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.min(100, value));
}

function memoryToGb(value: unknown): number | null {
  const number = toNumber(value);
  if (number === null || number <= 0) return null;
  if (number >= 40_000_000_000) return number / 1024 / 1024 / 1024;
  if (number >= 4_000_000) return number / 1024 / 1024;
  if (number >= 4_096) return number / 1024;
  return number;
}

function bytesToGb(value: unknown): number | null {
  const number = toNumber(value);
  if (number === null || number <= 0) return null;
  return number / 1024 / 1024 / 1024;
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function mapHistoryRow(row: PerformanceRow): HardwarePerformancePoint {
  const memoryTotalGb = memoryToGb(row.TotalMem);
  const memoryAvailableGb = memoryToGb(row.AvailableMem);
  const memoryUsedGb = memoryTotalGb !== null && memoryAvailableGb !== null
    ? Math.max(0, memoryTotalGb - memoryAvailableGb)
    : null;
  const memory = memoryTotalGb !== null && memoryUsedGb !== null && memoryTotalGb > 0
    ? clamp((memoryUsedGb / memoryTotalGb) * 100)
    : null;
  const diskTotalGb = bytesToGb(row.DiskTotalBytes);
  const diskFreeGb = bytesToGb(row.DiskFreeBytes);
  const diskUsedGb = diskTotalGb !== null && diskFreeGb !== null
    ? Math.max(0, diskTotalGb - diskFreeGb)
    : null;
  const disk = diskTotalGb !== null && diskUsedGb !== null && diskTotalGb > 0
    ? clamp((diskUsedGb / diskTotalGb) * 100)
    : null;

  return {
    recordedAt: toIso(row.CurrentTime),
    cpu: clamp(toNumber(row.CPUUsage)),
    memory,
    memoryUsedGb,
    memoryTotalGb,
    disk,
    diskUsedGb,
    diskTotalGb,
  };
}

function getRangeHours(range: PerformanceRange): number {
  switch (range) {
    case "1h": return 1;
    case "7d": return 24 * 7;
    case "24h":
    default: return 24;
  }
}

export async function getHardwarePerformance(
  agentId: string,
  limit = 60,
  range: PerformanceRange = "24h",
): Promise<HardwarePerformancePoint[]> {
  const db = await getDb();
  const safeLimit = Math.max(1, Math.min(180, Math.floor(limit)));
  const safeRange = getRangeHours(range);
  const bucket = getPerformanceBucket(range);

  const request = db.request();
  request.input("agentId", sql.NVarChar(40), agentId);
  request.input("rangeHours", sql.Int, safeRange);

  const result = await request.query(`
    SELECT TOP (${PERFORMANCE_SCAN_ROWS})
      mh.ID,
      mh.AgentID,
      mh.CPUUsage,
      mh.TotalMem,
      mh.AvailableMem,
      mh.CurrentTime,
      (
        SELECT SUM(CAST(d.Capacity AS DECIMAL(38,2)))
        FROM TB_INV_DISK d
        WHERE d.AgentID = mh.AgentID
      ) AS DiskTotalBytes,
      (
        SELECT SUM(CAST(d.FreeSpace AS DECIMAL(38,2)))
        FROM TB_INV_DISK d
        WHERE d.AgentID = mh.AgentID
      ) AS DiskFreeBytes
    FROM TB_MONITORHISTORY mh
    WHERE
      mh.AgentID = @agentId
      AND mh.CurrentTime IS NOT NULL
      AND mh.CurrentTime >= DATEADD(HOUR, -@rangeHours, GETDATE())
    ORDER BY mh.CurrentTime DESC, mh.ID DESC
  `);

  const points = (result.recordset as PerformanceRow[]).map(mapHistoryRow).reverse();
  const aggregated = aggregatePerformance(points, bucket);

  return aggregated.length > safeLimit
    ? aggregated.slice(aggregated.length - safeLimit)
    : aggregated;
}
