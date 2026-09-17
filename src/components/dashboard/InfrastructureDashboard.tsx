"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  HardDrive,
  Laptop,
  Monitor,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Hardware, HardwareSummary } from "@/types/hardware";

type ComplianceStatus =
  "CURRENT" | "UPDATE_AVAILABLE" | "UNSUPPORTED_VERSION" | "UNKNOWN";

type ComplianceDevice = {
  agentId: string | null;
  hostname: string;
  deviceClass: string | null;
  ipAddress: string | null;

  user: string | null;
  department: string | null;
  location: string | null;

  online: boolean;

  windowsVersion: string | null;
  windowsBuild: string | null;

  lastSeen: string | null;

  comparison: {
    status: ComplianceStatus;
    currentVersion: string | null;
    currentBuild: string | null;
    latestBuild: string | null;
    latestKb: string | null;
    latestReleaseDate: string | null;
    revisionsBehind: number | null;
    endOfUpdates: string | null;
  };
};

type ComplianceResponse = {
  ok: boolean;
  generatedOn?: string;
  summary?: {
    total: number;
    current: number;
    updateAvailable: number;
    unsupported: number;
    unknown: number;
  };
  devices?: ComplianceDevice[];
  error?: string;
};

type HardwareResponse = {
  success: boolean;
  data: Hardware[];
  count: number;
  error?: string;
};

type DashboardData = {
  hardware: Hardware[];
  compliance: ComplianceDevice[];
  generatedOn: string | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatThaiDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getHardwareSummary(devices: Hardware[]): HardwareSummary {
  return {
    total: devices.length,

    healthy: devices.filter((device) => device.status === "HEALTHY").length,

    warning: devices.filter((device) => device.status === "WARNING").length,

    critical: devices.filter((device) => device.status === "CRITICAL").length,

    offline: devices.filter((device) => device.status === "OFFLINE").length,

    unknown: devices.filter((device) => device.status === "UNKNOWN").length,

    updatePending: devices.filter(
      (device) =>
        device.windowsUpdate === "UPDATE_AVAILABLE" ||
        device.windowsUpdate === "UNSUPPORTED_VERSION",
    ).length,

    desktop: devices.filter((device) => device.deviceClass === "DESKTOP")
      .length,

    notebook: devices.filter((device) => device.deviceClass === "NOTEBOOK")
      .length,
  };
}

function getStatusLabel(status: Hardware["status"]) {
  switch (status) {
    case "HEALTHY":
      return "Healthy";

    case "WARNING":
      return "Warning";

    case "CRITICAL":
      return "Critical";

    case "OFFLINE":
      return "Offline";

    default:
      return "Unknown";
  }
}

function getStatusClass(status: Hardware["status"]) {
  switch (status) {
    case "HEALTHY":
      return "bg-emerald-500";

    case "WARNING":
      return "bg-amber-500";

    case "CRITICAL":
      return "bg-red-500";

    case "OFFLINE":
      return "bg-slate-500";

    default:
      return "bg-slate-400";
  }
}

function getStatusBadgeClass(status: Hardware["status"]) {
  switch (status) {
    case "HEALTHY":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

    case "WARNING":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";

    case "CRITICAL":
      return "bg-red-500/10 text-red-700 dark:text-red-400";

    case "OFFLINE":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";

    default:
      return "bg-muted text-muted-foreground";
  }
}

function getHardwareHref(device: Hardware) {
  return `/hardware/${encodeURIComponent(device.id)}`;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  className = "",
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  href?: string;
  className?: string;
}) {
  const content = (
    <div
      className={[
        "rounded-xl border bg-background p-5 shadow-sm transition-all",
        href
          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          : "",
        className,
      ].join(" ")}
    >
      {" "}
      <div className="flex items-start justify-between gap-4">
        {" "}
        <div className="min-w-0">
          {" "}
          <p className="text-sm font-medium text-muted-foreground">{title} </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {description ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}{" "}
    </Link>
  );
}

function SectionHeader({
  title,
  description,
  href,
  hrefLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {" "}
      <div>
        {" "}
        <h2 className="text-base font-semibold">{title} </h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {hrefLabel ?? "ดูทั้งหมด"}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  icon: Icon,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  suffix?: string;
}) {
  const percentage =
    total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      {" "}
      <div className="flex items-center justify-between gap-3 text-sm">
        {" "}
        <div className="flex min-w-0 items-center gap-2">
          {" "}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {formatNumber(value)}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
      <div className="text-right text-[11px] text-muted-foreground">
        {percentage}%
      </div>
    </div>
  );
}

export default function InfrastructureDashboard() {
  const [data, setData] = useState<DashboardData>({
    hardware: [],
    compliance: [],
    generatedOn: null,
  });

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const [hardwareResponse, complianceResponse] = await Promise.all([
        fetch("/api/hardware?type=ALL", {
          cache: "no-store",
        }),

        fetch("/api/update/compliance", {
          cache: "no-store",
        }),
      ]);

      const hardwareJson = (await hardwareResponse.json()) as HardwareResponse;

      const complianceJson =
        (await complianceResponse.json()) as ComplianceResponse;

      if (!hardwareResponse.ok || !hardwareJson.success) {
        throw new Error(
          hardwareJson.error ?? "ไม่สามารถโหลดข้อมูล Hardware ได้",
        );
      }

      if (!complianceResponse.ok || !complianceJson.ok) {
        throw new Error(
          complianceJson.error ?? "ไม่สามารถโหลดข้อมูล Windows Update ได้",
        );
      }

      setData({
        hardware: hardwareJson.data ?? [],

        compliance: complianceJson.devices ?? [],

        generatedOn: complianceJson.generatedOn ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Dashboard] failed:", err);

      setError(
        err instanceof Error ? err.message : "ไม่สามารถโหลด Dashboard ได้",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount; setLoading(true) inside loadDashboard()
    // must run synchronously so the skeleton shows immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();

    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  const summary = useMemo(
    () => getHardwareSummary(data.hardware),
    [data.hardware],
  );

  const onlineCount = useMemo(
    () => data.hardware.filter((device) => device.status !== "OFFLINE").length,
    [data.hardware],
  );

  const offlineCount = summary.offline;

  const healthyPercentage =
    summary.total > 0 ? Math.round((summary.healthy / summary.total) * 100) : 0;

  const complianceSummary = useMemo(
    () => ({
      total: data.compliance.length,

      current: data.compliance.filter(
        (device) => device.comparison.status === "CURRENT",
      ).length,

      update: data.compliance.filter(
        (device) => device.comparison.status === "UPDATE_AVAILABLE",
      ).length,

      unsupported: data.compliance.filter(
        (device) => device.comparison.status === "UNSUPPORTED_VERSION",
      ).length,

      unknown: data.compliance.filter(
        (device) => device.comparison.status === "UNKNOWN",
      ).length,
    }),
    [data.compliance],
  );

  const problemDevices = useMemo(() => {
    const severity: Record<Hardware["status"], number> = {
      CRITICAL: 5,
      OFFLINE: 4,
      WARNING: 3,
      UNKNOWN: 1,
      HEALTHY: 0,
    };

    return [...data.hardware]
      .filter((device) => device.status !== "HEALTHY")
      .sort(
        (a, b) =>
          severity[b.status] - severity[a.status] ||
          a.hostname.localeCompare(b.hostname),
      )
      .slice(0, 8);
  }, [data.hardware]);

  const resourceStats = useMemo(() => {
    const cpuValues = data.hardware
      .map((device) => device.cpu)
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    const memoryValues = data.hardware
      .map((device) => device.memory)
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    const diskValues = data.hardware
      .map((device) => device.disk)
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    const average = (values: number[]) =>
      values.length > 0
        ? Math.round(
            values.reduce((total, value) => total + value, 0) / values.length,
          )
        : 0;

    return {
      cpu: average(cpuValues),
      memory: average(memoryValues),
      disk: average(diskValues),
    };
  }, [data.hardware]);

  if (loading) {
    return (
      <div className="space-y-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 8,
          }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border bg-muted/30"
            />
          ))}{" "}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border bg-muted/30" />
          <div className="h-80 animate-pulse rounded-xl border bg-muted/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm">
          {" "}
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">ไม่สามารถโหลด Dashboard ได้</p>

            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      {/* Top summary */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Devices"
          value={formatNumber(summary.total)}
          description={`${formatNumber(
            summary.desktop,
          )} Desktop / ${formatNumber(summary.notebook)} Notebook`}
          icon={Server}
          href="/hardware"
        />

        <MetricCard
          title="Online"
          value={formatNumber(onlineCount)}
          description={`${healthyPercentage}% healthy fleet`}
          icon={Wifi}
          href="/hardware"
        />

        <MetricCard
          title="Offline"
          value={formatNumber(offlineCount)}
          description="เครื่องที่ไม่สามารถติดต่อได้"
          icon={WifiOff}
          href="/hardware"
        />

        <MetricCard
          title="Need Attention"
          value={formatNumber(
            summary.warning + summary.critical + summary.updatePending,
          )}
          description={`${summary.critical} Critical / ${summary.warning} Warning / ${summary.updatePending} Update`}
          icon={ShieldAlert}
          href="/hardware"
        />
      </div>

      {/* Status cards */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Healthy"
          value={summary.healthy}
          description="ระบบทำงานปกติ"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Warning"
          value={summary.warning}
          description="ควรตรวจสอบ"
          icon={AlertTriangle}
        />

        <MetricCard
          title="Critical"
          value={summary.critical}
          description="ต้องดำเนินการ"
          icon={AlertCircle}
        />

        <MetricCard
          title="Unknown"
          value={summary.unknown}
          description="ข้อมูลไม่เพียงพอ"
          icon={Clock3}
        />
      </div>

      {/* Main analytics */}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <SectionHeader
            title="System Health"
            description="สถานะเครื่องทั้งหมดจาก Hardware Monitor"
            href="/hardware"
            hrefLabel="Hardware Monitor"
          />

          <div className="mt-6 space-y-5">
            <ProgressBar
              label="Healthy"
              value={summary.healthy}
              total={summary.total}
              icon={CheckCircle2}
            />

            <ProgressBar
              label="Warning"
              value={summary.warning}
              total={summary.total}
              icon={AlertTriangle}
            />

            <ProgressBar
              label="Critical"
              value={summary.critical}
              total={summary.total}
              icon={AlertCircle}
            />

            <ProgressBar
              label="Offline"
              value={summary.offline}
              total={summary.total}
              icon={WifiOff}
            />
          </div>
        </section>

        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <SectionHeader
            title="Windows Compliance"
            description="เปรียบเทียบ Windows Build กับ production baseline"
            href="/update"
            hrefLabel="Windows Update"
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/update"
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />

                <div>
                  <p className="text-xs text-muted-foreground">ล่าสุด</p>

                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {complianceSummary.current}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/update"
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />

                <div>
                  <p className="text-xs text-muted-foreground">ต้องอัปเดต</p>

                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {complianceSummary.update}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/update"
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600" />

                <div>
                  <p className="text-xs text-muted-foreground">หมดระยะรองรับ</p>

                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {complianceSummary.unsupported}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/update"
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />

                <div>
                  <p className="text-xs text-muted-foreground">ไม่ทราบ</p>

                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {complianceSummary.unknown}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-5">
            <ProgressBar
              label="Windows ล่าสุด"
              value={complianceSummary.current}
              total={complianceSummary.total}
              icon={ShieldCheck}
            />
          </div>
        </section>
      </div>

      {/* Resources + inventory */}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <SectionHeader
            title="Resource Overview"
            description="ค่าเฉลี่ย CPU / RAM / Disk ของเครื่องที่มีข้อมูล"
            href="/hardware"
            hrefLabel="ดู Hardware"
          />

          <div className="mt-6 space-y-6">
            <ProgressBar
              label="Average CPU"
              value={resourceStats.cpu}
              total={100}
              icon={Cpu}
              suffix="%"
            />

            <ProgressBar
              label="Average Memory"
              value={resourceStats.memory}
              total={100}
              icon={Monitor}
              suffix="%"
            />

            <ProgressBar
              label="Average Disk"
              value={resourceStats.disk}
              total={100}
              icon={HardDrive}
              suffix="%"
            />
          </div>
        </section>

        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <SectionHeader
            title="Device Inventory"
            description="สัดส่วนประเภทเครื่องในระบบ"
            href="/hardware"
            hrefLabel="ดูทั้งหมด"
          />

          <div className="mt-6 space-y-6">
            <ProgressBar
              label="Desktop"
              value={summary.desktop}
              total={summary.total}
              icon={Monitor}
            />

            <ProgressBar
              label="Notebook"
              value={summary.notebook}
              total={summary.total}
              icon={Laptop}
            />
          </div>
        </section>
      </div>

      {/* Problem devices */}

      <section className="rounded-xl border bg-background shadow-sm">
        <div className="border-b p-5">
          <SectionHeader
            title="Problem Devices"
            description="เครื่องที่มีสถานะ Warning, Critical หรือ Offline"
            href="/hardware"
            hrefLabel="ดู Hardware ทั้งหมด"
          />
        </div>

        {problemDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>

            <p className="mt-3 text-sm font-medium">ไม่มีเครื่องที่มีปัญหา</p>

            <p className="mt-1 text-xs text-muted-foreground">
              ทุกเครื่องอยู่ในสถานะ Healthy
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {problemDevices.map((device) => (
              <Link
                key={device.id}
                href={getHardwareHref(device)}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <div
                  className={[
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    getStatusClass(device.status),
                  ].join(" ")}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {device.hostname}
                    </span>

                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        getStatusBadgeClass(device.status),
                      ].join(" ")}
                    >
                      {getStatusLabel(device.status)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {device.ipAddress ? <span>{device.ipAddress}</span> : null}

                    {device.department ? (
                      <span>{device.department}</span>
                    ) : null}

                    {device.location ? <span>{device.location}</span> : null}
                  </div>
                </div>

                <div className="hidden shrink-0 text-right md:block">
                  <p className="text-xs text-muted-foreground">Last contact</p>

                  <p className="mt-1 text-xs font-medium">
                    {formatThaiDateTime(device.lastContact)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer status */}

      <div className="flex flex-col gap-2 rounded-xl border bg-background px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          <span>Dashboard connected</span>

          <span className="text-muted-foreground/50">•</span>

          <span>Auto refresh 60s</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Updated: {formatThaiDateTime(data.generatedOn)}</span>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={["h-3.5 w-3.5", refreshing ? "animate-spin" : ""].join(
                " ",
              )}
            />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
