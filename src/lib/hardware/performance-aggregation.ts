import type { HardwarePerformancePoint } from "@/types/hardware";

export type PerformanceBucket = "raw" | "15m" | "1h";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullable(values: Array<number | null>): number | null {
  return average(values.filter((value): value is number => value !== null));
}

export function getPerformanceBucket(range: "1h" | "24h" | "7d"): PerformanceBucket {
  if (range === "1h") return "raw";
  if (range === "24h") return "15m";
  return "1h";
}

export function aggregatePerformance(
  points: HardwarePerformancePoint[],
  bucket: PerformanceBucket,
): HardwarePerformancePoint[] {
  if (bucket === "raw" || points.length <= 1) return points;

  const bucketMs = bucket === "15m" ? 15 * 60 * 1000 : 60 * 60 * 1000;
  const groups = new Map<number, HardwarePerformancePoint[]>();

  for (const point of points) {
    const timestamp = new Date(point.recordedAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const key = Math.floor(timestamp / bucketMs) * bucketMs;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, group]) => ({
      recordedAt: new Date(timestamp).toISOString(),
      cpu: averageNullable(group.map((point) => point.cpu)),
      memory: averageNullable(group.map((point) => point.memory)),
      memoryUsedGb: averageNullable(group.map((point) => point.memoryUsedGb)),
      memoryTotalGb: averageNullable(group.map((point) => point.memoryTotalGb)),
      disk: averageNullable(group.map((point) => point.disk)),
      diskUsedGb: averageNullable(group.map((point) => point.diskUsedGb)),
      diskTotalGb: averageNullable(group.map((point) => point.diskTotalGb)),
    }));
}
