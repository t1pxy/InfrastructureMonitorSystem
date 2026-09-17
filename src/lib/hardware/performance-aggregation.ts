import type { HardwarePerformancePoint } from "@/types/hardware";

export type PerformanceBucket = "raw" | "15m" | "1h" | "2h" | "4h";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullable(values: Array<number | null>): number | null {
  return average(values.filter((value): value is number => value !== null));
}

export function getPerformanceBucket(range: "1h" | "24h" | "7d" | "14d" | "30d"): PerformanceBucket {
  if (range === "1h") return "raw";
  if (range === "24h") return "15m";
  if (range === "7d") return "1h";
  if (range === "14d") return "2h";
  return "4h";
}

export function aggregatePerformance(
  points: HardwarePerformancePoint[],
  bucket: PerformanceBucket,
): HardwarePerformancePoint[] {
  if (bucket === "raw" || points.length <= 1) return points;

  const bucketMs =
    bucket === "15m" ? 15 * 60 * 1000 :
    bucket === "1h" ? 60 * 60 * 1000 :
    bucket === "2h" ? 2 * 60 * 60 * 1000 :
    4 * 60 * 60 * 1000;
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
