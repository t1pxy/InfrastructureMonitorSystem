"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HardwarePerformancePoint } from "@/types/hardware";

type Range = "1h" | "24h" | "7d";

type PerformanceResponse = {
  success: boolean;
  range?: Range;
  data?: HardwarePerformancePoint[];
  error?: string;
};

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

function average(values: Array<number | null>) {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${Math.round(value)}%`;
}

function formatTime(value: string, range: Range) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    ...(range === "7d"
      ? { month: "short", day: "numeric", hour: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" }),
  }).format(date);
}

function linePath(
  points: HardwarePerformancePoint[],
  key: "cpu" | "memory" | "disk",
  width: number,
  height: number,
) {
  const values = points.map((point) => point[key]);
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (valid.length === 0) return "";

  const x = (index: number) =>
    points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width;
  const y = (value: number) => height - (Math.max(0, Math.min(100, value)) / 100) * height;

  return points
    .map((point, index) => {
      const value = point[key];
      return value === null || !Number.isFinite(value)
        ? null
        : `${x(index).toFixed(2)},${y(value).toFixed(2)}`;
    })
    .filter((point): point is string => point !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point}`)
    .join(" ");
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatPercent(value)}</p>
    </div>
  );
}

export default function DashboardPerformanceTrend() {
  const [range, setRange] = useState<Range>("24h");
  const [points, setPoints] = useState<HardwarePerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const response = await fetch(`/api/dashboard/performance?range=${range}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as PerformanceResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "ไม่สามารถโหลด Performance Trend ได้");
      }

      setPoints(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Performance Trend ได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = points.at(-1) ?? null;
  const averages = useMemo(
    () => ({
      cpu: average(points.map((point) => point.cpu)),
      memory: average(points.map((point) => point.memory)),
      disk: average(points.map((point) => point.disk)),
    }),
    [points],
  );

  const chartWidth = 720;
  const chartHeight = 220;

  return (
    <section className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Performance Trend</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ค่าเฉลี่ย CPU / Memory / Disk จากข้อมูล Monitor History
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm">
          <p className="font-medium">ไม่สามารถโหลด Performance Trend</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-muted/30" />
      ) : points.length === 0 ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          ไม่มีข้อมูล Performance ในช่วงเวลาที่เลือก
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="CPU Average" value={averages.cpu} />
            <Metric label="Memory Average" value={averages.memory} />
            <Metric label="Disk Average" value={averages.disk} />
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border bg-muted/10 p-3">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full" role="img" aria-label="Infrastructure performance trend">
              {[0, 25, 50, 75, 100].map((value) => {
                const y = chartHeight - (value / 100) * chartHeight;
                return (
                  <g key={value}>
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeOpacity="0.1" />
                    <text x="4" y={Math.max(12, y - 4)} fontSize="10" fill="currentColor" opacity="0.5">
                      {value}%
                    </text>
                  </g>
                );
              })}
              <path d={linePath(points, "cpu", chartWidth, chartHeight)} fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d={linePath(points, "memory", chartWidth, chartHeight)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="7 5" opacity="0.65" />
              <path d={linePath(points, "disk", chartWidth, chartHeight)} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 5" opacity="0.45" />
            </svg>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>{formatTime(points[0].recordedAt, range)}</span>
              <div className="flex items-center gap-4">
                <span>CPU</span>
                <span>Memory</span>
                <span>Disk</span>
              </div>
              <span>{formatTime(latest?.recordedAt ?? points.at(-1)!.recordedAt, range)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
