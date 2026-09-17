"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  HardwarePerformancePoint,
  HardwarePerformanceResponse,
} from "@/types/hardware";

interface Props {
  agentId: string;
  initial?: HardwarePerformancePoint | null;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "th-TH",
    {
      timeZone:
        "Asia/Bangkok",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",

      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | null;
  subtitle: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <div className="mt-2 text-3xl font-bold">
            {value === null
              ? "-"
              : `${value.toFixed(0)}%`}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function LineChart({
  title,
  data,
  getValue,
}: {
  title: string;
  data: HardwarePerformancePoint[];
  getValue: (
    point: HardwarePerformancePoint,
  ) => number | null;
}) {
  const values =
    data
      .map(getValue)
      .filter(
        (value): value is number =>
          value !== null,
      );

  if (values.length < 2) {
    return (
      <div className="rounded-xl border bg-background p-5">
        <div className="font-semibold">
          {title}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          Not enough performance data
        </div>
      </div>
    );
  }

  const width = 700;
  const height = 220;
  const padding = 20;

  const points =
    data
      .map(
        (point, index) => {
          const value =
            getValue(
              point,
            );

          if (
            value === null
          ) {
            return null;
          }

          const x =
            padding +
            (index /
              Math.max(
                1,
                data.length -
                  1,
              )) *
              (width -
                padding * 2);

          const y =
            height -
            padding -
            (value /
              100) *
              (height -
                padding * 2);

          return `${x},${y}`;
        },
      )
      .filter(
        (
          point,
        ): point is string =>
          point !== null,
      )
      .join(" ");

  const latest =
    values[values.length - 1];

  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">
            {title}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Last:{" "}
            {latest.toFixed(1)}
            %
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full"
          preserveAspectRatio="none"
        >
          {[0, 25, 50, 75, 100].map(
            (value) => {
              const y =
                height -
                padding -
                (value /
                  100) *
                  (height -
                    padding *
                      2);

              return (
                <line
                  key={value}
                  x1={padding}
                  x2={
                    width -
                    padding
                  }
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={
                    0.1
                  }
                  strokeWidth="1"
                />
              );
            },
          )}

          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
}

export default function HardwarePerformancePanel({
  agentId,
  initial = null,
}: Props) {
  const [history, setHistory] =
    useState<
      HardwarePerformancePoint[]
    >([]);

  const [latest, setLatest] =
    useState<
      HardwarePerformancePoint | null
    >(initial);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  async function load(
    silent = false,
  ) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await fetch(
          `/api/hardware/${encodeURIComponent(
            agentId,
          )}/performance?limit=60`,
          {
            cache:
              "no-store",
          },
        );

      const json =
        (await response.json()) as HardwarePerformanceResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.error ||
            "Failed to load performance",
        );
      }

      setHistory(
        json.data ?? [],
      );

      setLatest(
        json.latest ??
          null,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(
        false,
      );
    }
  }

  useEffect(() => {
    // Intentional fetch-on-mount/agentId-change; setLoading(true) inside
    // load() must run synchronously so the skeleton shows immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const timer =
      window.setInterval(
        () => {
          void load(true);
        },
        30_000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Live Performance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            CPU and memory history from StarCat monitoring.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void load(true)
          }
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border bg-muted/30"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="CPU"
              value={
                latest?.cpu ??
                null
              }
              subtitle="Current processor usage"
              icon={Cpu}
            />

            <MetricCard
              title="RAM"
              value={
                latest?.memory ??
                null
              }
              subtitle={
                latest
                  ? `${latest.memoryUsedGb?.toFixed(
                      1,
                    ) ?? "-"} / ${
                      latest.memoryTotalGb?.toFixed(
                        1,
                      ) ?? "-"
                    } GB`
                  : "Current memory usage"
              }
              icon={MemoryStick}
            />

            <MetricCard
              title="Disk"
              value={
                latest?.disk ??
                null
              }
              subtitle={
                latest
                  ? `${latest.diskUsedGb?.toFixed(
                      1,
                    ) ?? "-"} / ${
                      latest.diskTotalGb?.toFixed(
                        1,
                      ) ?? "-"
                    } GB`
                  : "Current disk usage"
              }
              icon={HardDrive}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <LineChart
              title="CPU Usage"
              data={history}
              getValue={(point) =>
                point.cpu
              }
            />

            <LineChart
              title="Memory Usage"
              data={history}
              getValue={(point) =>
                point.memory
              }
            />
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">
              Last performance sample
            </div>

            <div className="mt-1 text-muted-foreground">
              {latest?.recordedAt
                ? formatDate(
                    latest.recordedAt,
                  )
                : "No performance data"}
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Disk history is not plotted because StarCat stores the disk inventory
              snapshot separately from CPU/RAM monitor history.
            </div>
          </div>
        </>
      )}
    </div>
  );
}