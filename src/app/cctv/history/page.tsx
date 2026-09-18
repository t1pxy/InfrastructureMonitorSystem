"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecordItem = {
  id: string;
  nvrId: string;
  nvrName?: string;
  channel: number | null;
  cameraName?: string;
  ipAddress?: string | null;
  site?: string | null;
  offlineSince: string;
  recoveredAt: string | null;
  durationSeconds: number | null;
  status: "ONGOING" | "RECOVERED";
};

function formatThai(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok", hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function duration(seconds: number | null, start: string, now: number) {
  const value = seconds ?? Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  const d = Math.floor(value / 86400);
  const h = Math.floor((value % 86400) / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  const clock = [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
  return d ? `${d}d ${clock}` : clock;
}

export default function CctvHistoryPage() {
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ONGOING" | "RECOVERED">("ALL");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/cctv/history?status=${status}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to load history");
      setRows(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [status]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.cameraName, row.ipAddress, row.nvrName, row.nvrId, row.site, String(row.channel ?? "")]
        .some((value) => value?.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/cctv" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CCTV Offline History</h1>
              <p className="mt-1 text-sm text-muted-foreground">ประวัติการ Offline และเวลาที่กล้องกลับมา Online</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Camera / IP / NVR / Site / Channel..." className="pl-9" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="ALL">All History</option>
            <option value="ONGOING">Currently Offline</option>
            <option value="RECOVERED">Recovered</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Camera</th>
                <th className="px-4 py-3">NVR / Site</th>
                <th className="px-4 py-3">Offline Since</th>
                <th className="px-4 py-3">Recovered At</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading history...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground"><History className="mx-auto mb-3 h-6 w-6" />No offline history found</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.cameraName ?? `CH ${row.channel ?? "-"}`}</div>
                    <div className="text-xs text-muted-foreground">{row.ipAddress ?? "-"} · CH {row.channel ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.nvrName ?? row.nvrId}</div>
                    <div className="text-xs text-muted-foreground">{row.site ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600">{formatThai(row.offlineSince)}</td>
                  <td className="px-4 py-3 text-xs">{formatThai(row.recoveredAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{duration(row.durationSeconds, row.offlineSince, now)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "ONGOING" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {row.status === "ONGOING" ? "OFFLINE" : "RECOVERED"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
