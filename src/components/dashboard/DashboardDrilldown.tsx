"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Laptop, ShieldAlert, WifiOff } from "lucide-react";

type Summary = {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  unknown: number;
  updatePending: number;
  desktop: number;
  notebook: number;
};

const EMPTY: Summary = {
  total: 0, healthy: 0, warning: 0, critical: 0, offline: 0,
  unknown: 0, updatePending: 0, desktop: 0, notebook: 0,
};

const items = [
  { key: "OFFLINE", label: "Offline", description: "เครื่องที่ไม่สามารถติดต่อได้", icon: WifiOff },
  { key: "CRITICAL", label: "Critical", description: "เครื่องที่ต้องดำเนินการ", icon: AlertCircle },
  { key: "WARNING", label: "Warning", description: "เครื่องที่ควรตรวจสอบ", icon: AlertTriangle },
  { key: "UPDATE_PENDING", label: "Update Pending", description: "เครื่องที่มี Windows Update", icon: ShieldAlert },
  { key: "NOTEBOOK", label: "Notebook", description: "อุปกรณ์ Notebook ทั้งหมด", icon: Laptop },
] as const;

export default function DashboardDrilldown() {
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const json = await response.json();
        if (active && response.ok && json.success) setSummary(json.summary ?? EMPTY);
      } catch (error) {
        console.error("[DashboardDrilldown] failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  return (
    <section className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Dashboard Drill-down</h2>
        <p className="text-xs text-muted-foreground">
          คลิกเพื่อเปิด Hardware Monitor พร้อม filter รายการที่เกี่ยวข้องทันที
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(({ key, label, description, icon: Icon }) => {
          const value = key === "OFFLINE" ? summary.offline
            : key === "CRITICAL" ? summary.critical
            : key === "WARNING" ? summary.warning
            : key === "UPDATE_PENDING" ? summary.updatePending
            : summary.notebook;

          return (
            <Link key={key} href={`/hardware?filter=${key}`} className="group rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
                <span className="text-xs font-medium text-primary">View →</span>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{loading ? "—" : value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link href="/hardware" className="rounded-xl border border-dashed p-4 text-sm font-medium transition-colors hover:bg-muted/30">View all hardware →</Link>
        <Link href="/update" className="rounded-xl border border-dashed p-4 text-sm font-medium transition-colors hover:bg-muted/30">Open Windows Update Center →</Link>
      </div>
    </section>
  );
}
