"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Video, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Nvr, NvrCamera, NvrDetailResponse } from "@/types/nvr";

export default function NvrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [nvr, setNvr] = useState<Nvr | null>(null);
  const [cameras, setCameras] = useState<NvrCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const { id } = await params;
      const response = await fetch(`/api/nvr/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await response.json()) as NvrDetailResponse;
      if (!response.ok || !json.success) throw new Error(json.error ?? "Failed to load NVR");
      setNvr(json.data);
      setCameras(json.cameras);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load NVR");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const online = cameras.filter((camera) => camera.status === "ONLINE").length;
  const offline = cameras.filter((camera) => camera.status === "OFFLINE").length;

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><Button asChild variant="ghost"><Link href="/nvr"><ArrowLeft className="mr-2 h-4 w-4" /> NVR Monitor</Link></Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
    {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    {nvr ? <>
      <div className="rounded-xl border bg-background p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><h1 className="text-2xl font-bold">{nvr.name}</h1><p className="mt-1 font-mono text-sm text-muted-foreground">{nvr.host}</p></div><span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{nvr.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Info label="Site" value={nvr.site ?? "-"} /><Info label="Model" value={nvr.model ?? "-"} /><Info label="Serial" value={nvr.serialNumber ?? "-"} /><Info label="Firmware" value={nvr.firmware ?? "-"} /><Info label="Last Check" value={nvr.lastChecked ? new Date(nvr.lastChecked).toLocaleString("th-TH") : "-"} /></div></div>
      <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<Video className="h-4 w-4" />} label="Total CCTV" value={cameras.filter((c) => c.channel !== null).length} /><Metric icon={<Wifi className="h-4 w-4" />} label="Online" value={online} /><Metric icon={<WifiOff className="h-4 w-4" />} label="Offline" value={offline} /></div>
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">CCTV Channels</h2><p className="text-xs text-muted-foreground">สถานะจาก Hikvision NVR ISAPI</p></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3">Channel</th><th className="px-5 py-3">Camera</th><th className="px-5 py-3">IP</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last Check</th></tr></thead><tbody className="divide-y">{cameras.map((camera) => <tr key={camera.id} className="hover:bg-muted/20"><td className="px-5 py-3 font-mono">CH {camera.channel ?? "-"}</td><td className="px-5 py-3 font-medium">{camera.name}</td><td className="px-5 py-3 font-mono text-xs">{camera.ipAddress ?? "-"}</td><td className="px-5 py-3"><Status status={camera.status} /></td><td className="px-5 py-3 text-xs text-muted-foreground">{camera.lastChecked ? new Date(camera.lastChecked).toLocaleString("th-TH") : "-"}</td></tr>)}</tbody></table></div></div>
      <div className="rounded-xl border bg-background p-5 shadow-sm"><h2 className="font-semibold">Storage</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{nvr.storage.length ? nvr.storage.map((disk) => <div key={disk.id} className="rounded-lg border p-4"><div className="flex justify-between"><span className="font-medium">{disk.name}</span><span className="text-xs">{disk.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{disk.capacityGb?.toFixed(1) ?? "-"} GB total · {disk.freeGb?.toFixed(1) ?? "-"} GB free</p></div>) : <p className="text-sm text-muted-foreground">No storage information returned by this NVR.</p>}</div></div>
    </> : loading ? <div className="rounded-xl border p-12 text-center text-muted-foreground">Loading Hikvision NVR...</div> : null}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="rounded-xl border bg-background p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function Status({ status }: { status: NvrCamera["status"] }) { const cls = status === "ONLINE" ? "bg-emerald-100 text-emerald-700" : status === "OFFLINE" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>; }
