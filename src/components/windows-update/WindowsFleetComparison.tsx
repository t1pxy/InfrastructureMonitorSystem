"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "CURRENT" | "UPDATE_AVAILABLE" | "UNSUPPORTED_VERSION" | "UNKNOWN";

type Comparison = {
  status: Status;
  currentVersion: string | null;
  currentBuild: string | null;
  latestBuild: string | null;
  latestKb: string | null;
  latestReleaseDate: string | null;
  revisionsBehind: number | null;
};

type Device = {
  agentId: string | null;
  hostname: string | null;
  deviceClass: string | null;
  ipAddress: string | null;
  department: string | null;
  location: string | null;
  online: boolean;
  comparison: Comparison;
};

type Payload = {
  ok: boolean;
  error?: string;
  generatedOn?: string;
  source?: string;
  summary?: {
    total: number;
    current: number;
    updateAvailable: number;
    unsupported: number;
    unknown: number;
  };
  devices?: Device[];
};

type Filter = "ALL" | Status;

const STATUS_LABEL: Record<Status, string> = {
  CURRENT: "ล่าสุด",
  UPDATE_AVAILABLE: "ต้องอัปเดต",
  UNSUPPORTED_VERSION: "หมดระยะรองรับ",
  UNKNOWN: "ไม่ทราบ",
};

function statusBadge(status: Status) {
  switch (status) {
    case "CURRENT":
      return <Badge>{STATUS_LABEL[status]}</Badge>;
    case "UPDATE_AVAILABLE":
      return <Badge variant="secondary">{STATUS_LABEL[status]}</Badge>;
    case "UNSUPPORTED_VERSION":
      return <Badge variant="destructive">{STATUS_LABEL[status]}</Badge>;
    default:
      return <Badge variant="outline">{STATUS_LABEL[status]}</Badge>;
  }
}

function formatCheckedAt(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function WindowsFleetComparison() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("UPDATE_AVAILABLE");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/update/compliance", {
        cache: "no-store",
      });

      const json = (await response.json()) as Payload;
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${response.status}`);
      }

      setPayload(json);
    } catch (cause) {
      setPayload(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "ไม่สามารถอ่านข้อมูล Windows จาก MSSQL ได้",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const devices = payload?.devices ?? [];

    const filtered = devices.filter((device) => {
      return filter === "ALL" || device.comparison.status === filter;
    });

    return [...filtered].sort((a, b) => {
      const aBehind = a.comparison.revisionsBehind ?? -1;
      const bBehind = b.comparison.revisionsBehind ?? -1;
      if (bBehind !== aBehind) return bBehind - aBehind;
      return String(a.hostname ?? "").localeCompare(String(b.hostname ?? ""));
    });
  }, [payload, filter]);

  const summary = payload?.summary ?? {
    total: 0,
    current: 0,
    updateAvailable: 0,
    unsupported: 0,
    unknown: 0,
  };

  const filterOptions: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "ทั้งหมด", count: summary.total },
    { key: "CURRENT", label: "ล่าสุด", count: summary.current },
    {
      key: "UPDATE_AVAILABLE",
      label: "ต้องอัปเดต",
      count: summary.updateAvailable,
    },
    {
      key: "UNSUPPORTED_VERSION",
      label: "หมดระยะรองรับ",
      count: summary.unsupported,
    },
    { key: "UNKNOWN", label: "ไม่ทราบ", count: summary.unknown },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Windows Patch Compliance</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            เทียบ Windows Build ของเครื่องจริงจาก MSSQL กับ Microsoft production baseline
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {filterOptions.map((item) => (
            <button
              key={item.key}
              className={`rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                filter === item.key ? "ring-2 ring-primary/30" : ""
              }`}
              onClick={() => setFilter(item.key)}
            >
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{item.count}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {filterOptions.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "default" : "outline"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Machine</th>
                <th className="px-4 py-3 text-left font-medium">Windows</th>
                <th className="px-4 py-3 text-left font-medium">Current Build</th>
                <th className="px-4 py-3 text-left font-medium">Latest Build</th>
                <th className="px-4 py-3 text-left font-medium">Latest KB</th>
                <th className="px-4 py-3 text-left font-medium">Behind</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((device, index) => (
                <tr
                  key={device.agentId ?? device.hostname ?? `row-${index}`}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{device.hostname ?? device.agentId ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{device.ipAddress ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">{device.comparison.currentVersion ?? "-"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {device.comparison.currentBuild ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {device.comparison.latestBuild ?? "-"}
                  </td>
                  <td className="px-4 py-3">{device.comparison.latestKb ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {device.comparison.revisionsBehind ?? "-"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(device.comparison.status)}</td>
                </tr>
              ))}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    ไม่มีข้อมูลสำหรับสถานะนี้
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          สถานะนี้คำนวณจาก Windows Version + Build ของเครื่อง เทียบกับ Microsoft baseline
        </div>

        <div className="text-xs text-muted-foreground">
          Last checked: {formatCheckedAt(payload?.generatedOn)}
        </div>
      </CardContent>
    </Card>
  );
}
