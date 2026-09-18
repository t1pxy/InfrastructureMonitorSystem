"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { Nvr, NvrCamera, NvrDetailResponse } from "@/types/nvr";

function formatThai(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("th-TH", {
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

function routeCandidates(value: string) {
  const values = new Set<string>([value]);

  let current = value;

  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current);

      if (decoded === current) {
        break;
      }

      values.add(decoded);
      current = decoded;
    } catch {
      break;
    }
  }

  return Array.from(values);
}

export default function NvrDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const [nvr, setNvr] = useState<Nvr | null>(null);

  const [cameras, setCameras] = useState<NvrCamera[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [nvrId, setNvrId] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  /*
   * Realtime clock for Offline Duration.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void params.then(({ id }) => {
      if (!cancelled) {
        setNvrId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!nvrId) {
      return;
    }

    void load(nvrId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvrId]);

  async function load(id = nvrId) {
    if (!id) {
      return;
    }

    try {
      setError(null);

      setLoading(true);

      const candidates = routeCandidates(id);

      let lastError = "NVR not found or could not be loaded";

      for (const candidate of candidates) {
        const response = await fetch(
          `/api/nvr/${encodeURIComponent(candidate)}`,
          {
            cache: "no-store",
          },
        );

        const json = (await response.json()) as NvrDetailResponse;

        if (response.ok && json.success && json.nvr) {
          setNvr(json.nvr);

          setCameras(json.cameras ?? []);

          setNvrId(json.nvr.routeId || candidate);

          return;
        }

        lastError = json.error ?? lastError;
      }

      throw new Error(lastError);
    } catch (cause) {
      setNvr(null);

      setCameras([]);

      setError(cause instanceof Error ? cause.message : "Failed to load NVR");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const realCameras = cameras.filter((camera) => camera.channel !== null);

  const online = realCameras.filter(
    (camera) => camera.status === "ONLINE",
  ).length;

  const offline = realCameras.filter(
    (camera) => camera.status === "OFFLINE",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/nvr"
          className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          NVR Monitor
        </Link>

        <div className="flex gap-2">
          <Link
            href="/cctv"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Video className="mr-2 h-4 w-4" />
            All CCTV
          </Link>

          <Button
            variant="outline"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={loading || refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loading || refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Cannot load NVR</div>

          <div className="mt-1 break-words">{error}</div>

          {nvrId ? (
            <div className="mt-2 font-mono text-xs opacity-80">
              Route ID: {nvrId}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && !nvr ? (
        <div className="rounded-xl border bg-background p-12 text-center text-muted-foreground">
          Connecting to Hikvision NVR...
        </div>
      ) : null}

      {nvr ? (
        <>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <h1 className="text-2xl font-bold">{nvr.name}</h1>

                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {nvr.host}
                </p>

                {nvr.error ? (
                  <p className="mt-2 text-sm text-red-600">{nvr.error}</p>
                ) : null}
              </div>

              <span
                className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  nvr.status === "ONLINE"
                    ? "bg-emerald-100 text-emerald-700"
                    : nvr.status === "OFFLINE"
                      ? "bg-red-100 text-red-700"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {nvr.status}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Info label="Site" value={nvr.site ?? "-"} />

              <Info label="Model" value={nvr.model ?? "-"} />

              <Info label="Serial" value={nvr.serialNumber ?? "-"} />

              <Info label="Firmware" value={nvr.firmware ?? "-"} />

              <Info label="Last Check" value={formatThai(nvr.lastChecked)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={<Video className="h-4 w-4" />}
              label="Total CCTV"
              value={realCameras.length}
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
          </div>

          <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="font-semibold">CCTV Channels</h2>

                <p className="text-xs text-muted-foreground">
                  สถานะจาก Hikvision NVR ISAPI
                </p>
              </div>

              <Link
                href="/cctv"
                className="inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-medium hover:bg-muted"
              >
                View All CCTV
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Channel</th>

                    <th className="px-5 py-3">Camera</th>

                    <th className="px-5 py-3">IP</th>

                    <th className="px-5 py-3">Status</th>

                    <th className="px-5 py-3">Offline Since</th>

                    <th className="px-5 py-3">Duration</th>

                    <th className="px-5 py-3">Last Check</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {realCameras.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-muted-foreground"
                      >
                        No CCTV channel data returned by this NVR.
                      </td>
                    </tr>
                  ) : (
                    realCameras.map((camera) => (
                      <tr key={camera.id} className="hover:bg-muted/20">
                        <td className="px-5 py-3 font-mono">
                          CH {camera.channel ?? "-"}
                        </td>

                        <td className="px-5 py-3 font-medium">{camera.name}</td>

                        <td className="px-5 py-3 font-mono text-xs">
                          {camera.ipAddress ?? "-"}
                        </td>

                        <td className="px-5 py-3">
                          <Status status={camera.status} />
                        </td>

                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {camera.status === "OFFLINE" || camera.offlineSince
                            ? formatThai(camera.offlineSince)
                            : "-"}
                        </td>

                        <td className="px-5 py-3 text-xs">
                          {camera.status === "OFFLINE"
                            ? durationSince(camera.offlineSince, now)
                            : "-"}
                        </td>

                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {formatThai(camera.lastChecked)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <h2 className="font-semibold">Storage</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {nvr.storage.length > 0 ? (
                nvr.storage.map((disk) => (
                  <div key={disk.id} className="rounded-lg border p-4">
                    <div className="flex justify-between">
                      <span className="font-medium">{disk.name}</span>

                      <span className="text-xs">{disk.status}</span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {disk.capacityGb?.toFixed(1) ?? "-"} GB total ·{" "}
                      {disk.freeGb?.toFixed(1) ?? "-"} GB free
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No storage information returned by this NVR.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 truncate text-sm font-medium">{value}</p>
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

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Status({ status }: { status: NvrCamera["status"] }) {
  const cls =
    status === "ONLINE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "OFFLINE"
        ? "bg-red-100 text-red-700"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}
