"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, HardDrive, RefreshCw, Search, Video, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Nvr, NvrListResponse } from "@/types/nvr";

const PAGE_SIZE = 20;

function statusClass(status: Nvr["status"]) {
  if (status === "ONLINE") return "bg-emerald-100 text-emerald-700";
  if (status === "OFFLINE") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

export default function NvrPage() {
  const [rows, setRows] = useState<Nvr[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const response = await fetch("/api/nvr", { cache: "no-store" });
      const json = (await response.json()) as NvrListResponse;
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to load NVRs");
      setRows(json.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load NVRs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.host, row.site, row.model, row.serialNumber].some(
        (value) => value?.toLowerCase().includes(q),
      ),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const online = rows.filter((row) => row.status === "ONLINE").length;
  const offline = rows.filter((row) => row.status === "OFFLINE").length;
  const cameras = rows.reduce((sum, row) => sum + row.cameraCount, 0);
  const cameraOffline = rows.reduce((sum, row) => sum + row.offlineCameraCount, 0);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hikvision NVR Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor NVR status, CCTV channels and storage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cctv"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Video className="mr-2 h-4 w-4" />
            View All CCTV
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Video className="h-4 w-4" />} label="Total NVR" value={rows.length} />
        <SummaryCard icon={<Wifi className="h-4 w-4" />} label="NVR Online" value={online} />
        <SummaryCard icon={<WifiOff className="h-4 w-4" />} label="NVR Offline" value={offline} />
        <SummaryCard icon={<Video className="h-4 w-4" />} label="CCTV Offline" value={`${cameraOffline} / ${cameras}`} />
      </div>

      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search NVR / IP / Site / Model..."
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <b>Cannot load NVR:</b> {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">NVR</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">CCTV</th>
                <th className="px-4 py-3">Storage</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading Hikvision NVR...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No NVR found</td></tr>
              ) : visible.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.serialNumber ?? "Serial unavailable"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.host}</td>
                  <td className="px-4 py-3">{row.site ?? "-"}</td>
                  <td className="px-4 py-3">{row.model ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.onlineCameraCount} online</div>
                    <div className="text-xs text-muted-foreground">{row.offlineCameraCount} offline / {row.cameraCount} total</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5"><HardDrive className="h-4 w-4 text-muted-foreground" />{row.storage.length} HDD</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/nvr/${encodeURIComponent(row.id)}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      View CCTV
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
