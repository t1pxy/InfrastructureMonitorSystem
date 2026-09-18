"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  RefreshCw,
  Search,
  Server,
  Video,
  Wifi,
  WifiOff,
  CircleHelp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CameraStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

type Camera = {
  id: string;
  channel: number | null;
  name: string;
  ipAddress: string | null;
  status: CameraStatus;
  lastChecked: string | null;
  offlineSince?: string | null;
  nvrId: string;
  nvrRouteId: string;
  nvrName: string;
  nvrHost: string;
  site: string | null;
};

type ResponseData = {
  success: boolean;
  data: Camera[];
  count: number;
  error?: string;
  summary?: {
    total: number;
    online: number;
    offline: number;
    unknown: number;
  };
};

const PAGE_SIZE = 25;
const AUTO_REFRESH_MS = 60_000;

function statusClass(status: CameraStatus) {
  if (status === "ONLINE") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "OFFLINE") {
    return "bg-red-100 text-red-700";
  }

  return "bg-muted text-muted-foreground";
}

function statusDotClass(status: CameraStatus) {
  if (status === "ONLINE") {
    return "bg-emerald-500";
  }

  if (status === "OFFLINE") {
    return "bg-red-500";
  }

  return "bg-muted-foreground";
}

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
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
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

export default function CctvPage() {
  const [rows, setRows] = useState<Camera[]>([]);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<CameraStatus | "ALL">("ALL");

  const [nvrFilter, setNvrFilter] = useState("ALL");

  const [siteFilter, setSiteFilter] = useState("ALL");

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  /*
   * Realtime clock.
   *
   * This is only for displaying Offline Duration.
   * It does not make requests to the server.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function load(showLoading = false) {
    try {
      setError(null);

      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch("/api/cctv", {
        cache: "no-store",
      });

      const json = (await response.json()) as ResponseData;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load CCTV");
      }

      setRows(Array.isArray(json.data) ? json.data : []);

      setLastRefresh(new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load CCTV");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Initial load.
   */
  useEffect(() => {
    void load(true);
  }, []);

  /*
   * Automatic refresh every 60 seconds.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      void load(false);
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
   * Build NVR filter options.
   */
  const nvrOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const row of rows) {
      if (!map.has(row.nvrId)) {
        map.set(row.nvrId, row.nvrName);
      }
    }

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  /*
   * Build Site filter options.
   */
  const siteOptions = useMemo(() => {
    const values = new Set<string>();

    for (const row of rows) {
      if (row.site?.trim()) {
        values.add(row.site.trim());
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  /*
   * Filter data.
   */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;

      const matchesNvr = nvrFilter === "ALL" || row.nvrId === nvrFilter;

      const matchesSite = siteFilter === "ALL" || row.site === siteFilter;

      const matchesSearch =
        !q ||
        [
          row.name,
          row.ipAddress,
          row.nvrName,
          row.nvrHost,
          row.nvrId,
          row.site,
          String(row.channel ?? ""),
        ].some((value) => value?.toLowerCase().includes(q));

      return matchesStatus && matchesNvr && matchesSite && matchesSearch;
    });
  }, [rows, search, status, nvrFilter, siteFilter]);

  /*
   * Pagination.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /*
   * Global counters.
   */
  const online = rows.filter((row) => row.status === "ONLINE").length;

  const offline = rows.filter((row) => row.status === "OFFLINE").length;

  const unknown = rows.filter((row) => row.status === "UNKNOWN").length;

  const hasFilters = Boolean(
    search.trim() ||
    status !== "ALL" ||
    nvrFilter !== "ALL" ||
    siteFilter !== "ALL",
  );

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setNvrFilter("ALL");
    setSiteFilter("ALL");
    setPage(1);
  }

  async function refresh() {
    setRefreshing(true);

    try {
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Hikvision CCTV Monitor
            </h1>

            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Auto Refresh 60s
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            รวมทุก Camera Channel จาก NVR ที่กำหนดไว้
          </p>

          {lastRefresh ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last refresh: {formatThai(lastRefresh)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/nvr"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Server className="mr-2 h-4 w-4" />
            View NVR Monitor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>

          <Button
            variant="outline"
            onClick={refresh}
            disabled={refreshing || loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                refreshing || loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Video className="h-4 w-4" />}
          label="Total CCTV"
          value={rows.length}
        />

        <Metric
          icon={<Wifi className="h-4 w-4" />}
          label="Online"
          value={online}
        />

        <Metric
          icon={<WifiOff className="h-4 w-4" />}
          label="Offline"
          value={offline}
        />

        <Metric
          icon={<CircleHelp className="h-4 w-4" />}
          label="Unknown"
          value={unknown}
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_200px_180px_auto]">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search Camera / IP / NVR / Site / Channel..."
              className="pl-9"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CameraStatus | "ALL");
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Status</option>

            <option value="ONLINE">Online</option>

            <option value="OFFLINE">Offline</option>

            <option value="UNKNOWN">Unknown</option>
          </select>

          {/* NVR */}
          <select
            value={nvrFilter}
            onChange={(event) => {
              setNvrFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All NVR</option>

            {nvrOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Site */}
          <select
            value={siteFilter}
            onChange={(event) => {
              setSiteFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Site</option>

            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>

          {/* Clear */}
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Filter result */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{rows.length}</span>{" "}
            cameras
          </span>

          {hasFilters ? <span>Filtered result</span> : <span>All cameras</span>}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Cannot load CCTV</div>

          <div className="mt-1 break-words">{error}</div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Channel</th>

                <th className="px-4 py-3">Camera</th>

                <th className="px-4 py-3">IP</th>

                <th className="px-4 py-3">NVR</th>

                <th className="px-4 py-3">Site</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3">Offline Since</th>

                <th className="px-4 py-3">Duration</th>

                <th className="px-4 py-3">Last Check</th>

                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Loading Hikvision CCTV...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    <Video className="mx-auto mb-3 h-6 w-6" />

                    <div className="font-medium text-foreground">
                      No CCTV found
                    </div>

                    {hasFilters ? (
                      <div className="mt-1 text-xs">
                        ลองเปลี่ยน Filter หรือ Search
                      </div>
                    ) : null}
                  </td>
                </tr>
              ) : (
                visible.map((camera) => (
                  <tr
                    key={camera.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Channel */}
                    <td className="px-4 py-3 font-mono">
                      CH {camera.channel ?? "-"}
                    </td>

                    {/* Camera */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{camera.name}</div>

                      <div className="text-[11px] text-muted-foreground">
                        {camera.id}
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 font-mono text-xs">
                      {camera.ipAddress ?? "-"}
                    </td>

                    {/* NVR */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{camera.nvrName}</div>

                      <div className="font-mono text-xs text-muted-foreground">
                        {camera.nvrHost}
                      </div>
                    </td>

                    {/* Site */}
                    <td className="px-4 py-3">{camera.site ?? "-"}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${statusDotClass(
                            camera.status,
                          )}`}
                        />

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            camera.status,
                          )}`}
                        >
                          {camera.status}
                        </span>
                      </div>
                    </td>

                    {/* Offline Since */}
                    <td className="px-4 py-3 text-xs">
                      {camera.offlineSince ? (
                        <span className="text-red-600">
                          {formatThai(camera.offlineSince)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3">
                      {camera.status === "OFFLINE" ? (
                        <span className="font-mono text-xs font-medium text-red-600">
                          {durationSince(camera.offlineSince, now) ?? "-"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Last Check */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatThai(camera.lastChecked)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/nvr/${camera.nvrRouteId}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        View NVR
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
          </span>{" "}
          -{" "}
          <span className="font-medium text-foreground">
            {Math.min(currentPage * PAGE_SIZE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{filtered.length}</span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>

          <span className="min-w-[100px] text-center text-xs">
            Page <span className="font-semibold">{currentPage}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      </div>
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
  value: React.ReactNode;
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
