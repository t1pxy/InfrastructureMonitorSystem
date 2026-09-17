import sql from "mssql";

import { getDb } from "@/lib/db";
import { getPerformanceBucket, aggregatePerformance } from "@/lib/hardware/performance-aggregation";
import type { HardwarePerformancePoint } from "@/types/hardware";

const MAX_SCAN_ROWS = 250000;

export type DashboardPerformanceRange = "1h" | "24h" | "7d";

interface PerformanceRow {
  ID: number;
  CPUUsage: number | null;
  TotalMem: number | null;
  AvailableMem: number | null;
  CurrentTime: Date | string;
  DiskTotalBytes: number | string | null;
  DiskFreeBytes: number | string | null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.min(100, value));
}

function memoryToGb(value: unknown): number | null {
  const n = numberOrNull(value);
  if (n === null || n <= 0) return null;
  if (n >= 40_000_000_000) return n / 1024 / 1024 / 1024;
  if (n >= 4_000_000) return n / 1024 / 1024;
  if (n >= 4_096) return n / 1024;
  return n;
}

function bytesToGb(value: unknown): number | null {
  const n = numberOrNull(value);
  if (n === null || n <= 0) return null;
  return n / 1024 / 1024 / 1024;
}

function toIso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function mapRow(row: PerformanceRow): HardwarePerformancePoint {
  const totalMemoryGb = memoryToGb(row.TotalMem);
  const availableMemoryGb = memoryToGb(row.AvailableMem);
  const usedMemoryGb =
    totalMemoryGb !== null && availableMemoryGb !== null
      ? Math.max(0, totalMemoryGb - availableMemoryGb)
      : null;
  const memory =
    totalMemoryGb !== null && usedMemoryGb !== null && totalMemoryGb > 0
      ? clamp((usedMemoryGb / totalMemoryGb) * 100)
      : null;

  const totalDiskGb = bytesToGb(row.DiskTotalBytes);
  const freeDiskGb = bytesToGb(row.DiskFreeBytes);
  const usedDiskGb =
    totalDiskGb !== null && freeDiskGb !== null
      ? Math.max(0, totalDiskGb - freeDiskGb)
      : null;
  const disk =
    totalDiskGb !== null && usedDiskGb !== null && totalDiskGb > 0
      ? clamp((usedDiskGb / totalDiskGb) * 100)
      : null;

  return {
    recordedAt: toIso(row.CurrentTime),
    cpu: clamp(numberOrNull(row.CPUUsage)),
    memory,
    memoryUsedGb: usedMemoryGb,
    memoryTotalGb: totalMemoryGb,
    disk,
    diskUsedGb: usedDiskGb,
    diskTotalGb: totalDiskGb,
  };
}

function rangeHours(range: DashboardPerformanceRange): number {
  if (range === "1h") return 1;
  if (range === "7d") return 24 * 7;
  return 24;
}

export async function getDashboardPerformance(
  range: DashboardPerformanceRange = "24h",
): Promise<HardwarePerformancePoint[]> {
  const db = await getDb();
  const hours = rangeHours(range);
  const bucket = getPerformanceBucket(range);
  const request = db.request();
  request.input("rangeHours", sql.Int, hours);

  const result = await request.query(`
    WITH recent_monitor AS (
      SELECT TOP (${MAX_SCAN_ROWS})
        mh.ID,
        mh.CPUUsage,
        mh.TotalMem,
        mh.AvailableMem,
        mh.CurrentTime,
        mh.AgentID
      FROM TB_MONITORHISTORY mh
      WHERE
        mh.CurrentTime IS NOT NULL
        AND mh.CurrentTime >= DATEADD(HOUR, -@rangeHours, GETDATE())
      ORDER BY mh.CurrentTime DESC, mh.ID DESC
    ),
    disk_totals AS (
      SELECT
        SUM(CAST(d.Capacity AS DECIMAL(38,2))) AS DiskTotalBytes,
        SUM(CAST(d.FreeSpace AS DECIMAL(38,2))) AS DiskFreeBytes
      FROM TB_INV_DISK d
    )
    SELECT
      rm.ID,
      rm.CPUUsage,
      rm.TotalMem,
      rm.AvailableMem,
      rm.CurrentTime,
      dt.DiskTotalBytes,
      dt.DiskFreeBytes
    FROM recent_monitor rm
    CROSS JOIN disk_totals dt
    ORDER BY rm.CurrentTime ASC, rm.ID ASC
  `);

  return aggregatePerformance(
    (result.recordset as PerformanceRow[]).map(mapRow),
    bucket,
  );
}
