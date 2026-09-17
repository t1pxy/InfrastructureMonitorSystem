"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Video, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Camera = {
  id: string;
  channel: number | null;
  name: string;
  ipAddress: string | null;
  status: "ONLINE" | "OFFLINE" | "UNKNOWN";
  lastChecked: string | null;
  offlineSince?: string | null;
  nvrId: string;
  nvrName: string;
  nvrHost: string;
  site: string | null;
};

type ResponseData = { success: boolean; data: Camera[]; count: number; error?: string };

const PAGE_SIZE = 25;

function statusClass(status: Camera["status"]) {
  if (status === "ONLINE") return "bg-emerald-100 text-emerald-700";
  if (status === "OFFLINE") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

function formatThai(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("th-TH", { hour12: false }) : "-";
}

export default function CctvPage() {
  const [rows, setRows] = useState<Camera[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const response = await fetch("/api/cctv", { cache: "no-store" });
      const json = (await response.json()) as ResponseData;
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to load CCTV");
      setRows(json.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load CCTV");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const matchesSearch = !q || [row.name, row.ipAddress, row.nvrName, row.nvrHost, row.site, String(row.channel ?? "")].some((value) => value?.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const online = rows.filter((row) => row.status === "ONLINE").length;
  const offline = rows.filter((row) => row.status === "OFFLINE").length;
  const unknown = rows.filter((row) => row.status === "UNKNOWN").length;

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div><h1 className="text-2xl font-bold tracking-tight">Hikvision CCTV Monitor</h1><p className="mt-1 text-sm text-muted-foreground">รวมทุก Camera Channel จาก NVR ที่กำหนดไว้</p></div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Video className="h-4 w-4" />} label="Total CCTV" value={rows.length} />
        <Metric icon={<Wifi className="h-4 w-4" />} label="Online" value={online} />
        <Metric icon={<WifiOff className="h-4 w-4" />} label="Offline" value={offline} />
        <Metric icon={<Video className="h-4 w-4" />} label="Unknown" value={unknown} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm md:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search Camera / IP / NVR / Site / Channel..." className="pl-9" /></div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8 rounded-lg border border-input bg-background px-3 text-sm"><option value="ALL">All Status</option><option value="ONLINE">Online</option><option value="OFFLINE">Offline</option><option value="UNKNOWN">Unknown</option></select>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>Cannot load CCTV:</b> {error}</div> : null}

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Camera</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">NVR</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last Check</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading Hikvision CCTV...</td></tr> : visible.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No CCTV found</td></tr> : visible.map((camera) => <tr key={camera.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-mono">CH {camera.channel ?? "-"}</td><td className="px-4 py-3 font-medium">{camera.name}</td><td className="px-4 py-3 font-mono text-xs">{camera.ipAddress ?? "-"}</td><td className="px-4 py-3"><div className="font-medium">{camera.nvrName}</div><div className="font-mono text-xs text-muted-foreground">{camera.nvrHost}</div></td><td className="px-4 py-3">{camera.site ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(camera.status)}`}>{camera.status}</span>{camera.offlineSince ? <div className="mt-1 text-[11px] text-red-600">Since {formatThai(camera.offlineSince)}</div> : null}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatThai(camera.lastChecked)}</td><td className="px-4 py-3 text-right"><Link href={`/nvr/${encodeURIComponent(camera.nvrId)}`} className="inline-flex h-8 items-center justify-center rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted">View NVR</Link></td></tr>)}</tbody></table></div></div>

      <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 text-sm"><span className="text-muted-foreground">Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><span>Page {currentPage} / {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="rounded-xl border bg-background p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-2 text-2xl font-bold tabular-nums">{value}</div></div>; }
