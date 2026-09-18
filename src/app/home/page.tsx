"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type CameraStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

type MonitorCameraState = {
  key: string;

  nvrId: string;
  nvrName: string;
  nvrRouteId: string;
  nvrHost: string;
  site: string | null;

  cameraId: string;
  channel: number | null;
  cameraName: string;
  ipAddress: string | null;

  status: CameraStatus;

  lastChecked: string | null;
  offlineSince: string | null;

  error: string | null;
};

type MonitorState = {
  version: number;

  startedAt: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;

  lastRunStatus: "RUNNING" | "SUCCESS" | "ERROR" | "NEVER";

  lastRunError: string | null;

  totalNvr: number;
  onlineNvr: number;
  offlineNvr: number;

  totalCamera: number;
  onlineCamera: number;
  offlineCamera: number;
  unknownCamera: number;

  cameras: Record<string, MonitorCameraState>;
};

type ApiResponse = {
  success: boolean;
  data: MonitorState;
  error?: string;
};

function formatThai(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",

    hour12: false,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function durationSince(value: string | null | undefined, now: number) {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  const days = Math.floor(seconds / 86400);

  const hours = Math.floor((seconds % 86400) / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  const secs = seconds % 60;

  const hh = String(hours).padStart(2, "0");

  const mm = String(minutes).padStart(2, "0");

  const ss = String(secs).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}`;
}

function statusBadge(status: CameraStatus) {
  if (status === "ONLINE") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "OFFLINE") {
    return "bg-red-100 text-red-700";
  }

  return "bg-muted text-muted-foreground";
}

export default function HomePage() {
  const [state, setState] = useState<MonitorState | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function load() {
    try {
      setError(null);

      const response = await fetch("/api/monitor/status", {
        cache: "no-store",
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load dashboard");
      }

      setState(json.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  async function runMonitor() {
    setRefreshing(true);

    try {
      const response = await fetch("/api/monitor/manual", {
        method: "POST",
        cache: "no-store",
      });

      const json = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Monitor failed");
      }

      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Monitor failed");
    } finally {
      setRefreshing(false);
    }
  }

  const offlineCameras = useMemo(() => {
    if (!state) {
      return [];
    }

    return Object.values(state.cameras)
      .filter((camera) => camera.status === "OFFLINE")
      .sort((a, b) => {
        const aa = a.offlineSince ? new Date(a.offlineSince).getTime() : 0;

        const bb = b.offlineSince ? new Date(b.offlineSince).getTime() : 0;

        return aa - bb;
      })
      .slice(0, 10);
  }, [state]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />

          <p className="text-sm text-muted-foreground">
            Loading monitor dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Infrastructure Monitor
            </h1>

            {state ? <MonitorStatus status={state.lastRunStatus} /> : null}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Hikvision NVR & CCTV monitoring dashboard
          </p>

          {state?.lastRunFinishedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last monitor check: {formatThai(state.lastRunFinishedAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/cctv"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            <Camera className="mr-2 h-4 w-4" />
            CCTV Monitor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>

          <Link
            href="/nvr"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            <Server className="mr-2 h-4 w-4" />
            NVR Monitor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>

          <Button variant="outline" onClick={runMonitor} disabled={refreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Run Check
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Monitor Error</div>

          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      {!state || state.lastRunStatus === "NEVER" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />

            <div>
              <div className="font-semibold text-amber-800">
                Monitor has not run yet
              </div>

              <p className="mt-1 text-sm text-amber-700">
                กด Run Check เพื่อทำการตรวจ NVR และ Camera ครั้งแรก
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* NVR metrics */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Server className="h-4 w-4" />

          <h2 className="font-semibold">NVR</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            icon={<Server className="h-4 w-4" />}
            label="Total NVR"
            value={state?.totalNvr ?? 0}
          />

          <Metric
            icon={<Wifi className="h-4 w-4" />}
            label="Online NVR"
            value={state?.onlineNvr ?? 0}
          />

          <Metric
            icon={<WifiOff className="h-4 w-4" />}
            label="Offline NVR"
            value={state?.offlineNvr ?? 0}
          />
        </div>
      </section>

      {/* Camera metrics */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4" />

          <h2 className="font-semibold">CCTV</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            icon={<Camera className="h-4 w-4" />}
            label="Total CCTV"
            value={state?.totalCamera ?? 0}
          />

          <Metric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Online"
            value={state?.onlineCamera ?? 0}
          />

          <Metric
            icon={<AlertCircle className="h-4 w-4" />}
            label="Offline"
            value={state?.offlineCamera ?? 0}
          />

          <Metric
            icon={<Activity className="h-4 w-4" />}
            label="Unknown"
            value={state?.unknownCamera ?? 0}
          />
        </div>
      </section>

      {/* Offline cameras */}
      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-red-500" />

              <h2 className="font-semibold">Offline Cameras</h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              แสดงกล้อง Offline ที่ตรวจพบล่าสุด
            </p>
          </div>

          <Link
            href="/cctv"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Camera</th>

                <th className="px-4 py-3">Channel</th>

                <th className="px-4 py-3">NVR</th>

                <th className="px-4 py-3">Site</th>

                <th className="px-4 py-3">Offline Since</th>

                <th className="px-4 py-3">Duration</th>

                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {offlineCameras.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                    No offline camera
                  </td>
                </tr>
              ) : (
                offlineCameras.map((camera) => (
                  <tr key={camera.key} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{camera.cameraName}</div>

                      <div className="font-mono text-xs text-muted-foreground">
                        {camera.ipAddress ?? "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      CH {camera.channel ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-medium">{camera.nvrName}</td>

                    <td className="px-4 py-3">{camera.site ?? "-"}</td>

                    <td className="px-4 py-3 text-xs text-red-600">
                      {formatThai(camera.offlineSince)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-red-600">
                        {durationSince(camera.offlineSince, now)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/nvr/${camera.nvrRouteId}`}
                        className="inline-flex h-8 items-center rounded-lg border px-2.5 text-xs hover:bg-muted"
                      >
                        View NVR
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Monitor information */}
      <section className="grid gap-3 lg:grid-cols-2">
        <InfoCard
          title="Monitor Status"
          icon={<Activity className="h-4 w-4" />}
        >
          <InfoRow label="Status" value={state?.lastRunStatus ?? "NEVER"} />

          <InfoRow
            label="Started"
            value={formatThai(state?.lastRunStartedAt)}
          />

          <InfoRow
            label="Finished"
            value={formatThai(state?.lastRunFinishedAt)}
          />

          <InfoRow
            label="Worker Started"
            value={formatThai(state?.startedAt)}
          />

          {state?.lastRunError ? (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {state.lastRunError}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard title="System" icon={<Server className="h-4 w-4" />}>
          <InfoRow label="CCTV" value={`${state?.totalCamera ?? 0} cameras`} />

          <InfoRow label="NVR" value={`${state?.totalNvr ?? 0} devices`} />

          <InfoRow label="Auto Refresh" value="15 seconds" />

          <InfoRow label="Monitor Interval" value="60 seconds" />
        </InfoCard>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MonitorStatus({
  status,
}: {
  status: "RUNNING" | "SUCCESS" | "ERROR" | "NEVER";
}) {
  const className =
    status === "SUCCESS"
      ? "bg-emerald-100 text-emerald-700"
      : status === "ERROR"
        ? "bg-red-100 text-red-700"
        : status === "RUNNING"
          ? "bg-blue-100 text-blue-700"
          : "bg-muted text-muted-foreground";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      Monitor {status}
    </span>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b pb-3">
        {icon}

        <h2 className="font-semibold">{title}</h2>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>

      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
