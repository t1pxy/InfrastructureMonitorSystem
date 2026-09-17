"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status =
  "CURRENT" | "UPDATE_AVAILABLE" | "UNSUPPORTED_VERSION" | "UNKNOWN";

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

const PAGE_SIZE = 20;

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
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function getHardwareHref(device: Device) {
  const id = device.agentId ?? device.hostname;

  if (!id) {
    return "#";
  }

  return `/hardware/${encodeURIComponent(id)}`;
}

export default function WindowsFleetComparison() {
  const [payload, setPayload] = useState<Payload | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("UPDATE_AVAILABLE");

  const [page, setPage] = useState(1);

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
      setPage(1);
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

    const filtered = devices.filter(
      (device) => filter === "ALL" || device.comparison.status === filter,
    );

    return [...filtered].sort((a, b) => {
      const aBehind = a.comparison.revisionsBehind ?? -1;

      const bBehind = b.comparison.revisionsBehind ?? -1;

      if (bBehind !== aBehind) {
        return bBehind - aBehind;
      }

      return String(a.hostname ?? "").localeCompare(String(b.hostname ?? ""));
    });
  }, [payload, filter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);

  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const rangeEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  const summary = payload?.summary ?? {
    total: 0,
    current: 0,
    updateAvailable: 0,
    unsupported: 0,
    unknown: 0,
  };

  const filterOptions: {
    key: Filter;
    label: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: "ทั้งหมด",
      count: summary.total,
    },
    {
      key: "CURRENT",
      label: "ล่าสุด",
      count: summary.current,
    },
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
    {
      key: "UNKNOWN",
      label: "ไม่ทราบ",
      count: summary.unknown,
    },
  ];

  const changeFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Windows Patch Compliance</CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            เทียบ Windows Build ของเครื่องจริงจาก MSSQL กับ Microsoft production
            baseline
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
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
              type="button"
              className={`rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                filter === item.key ? "ring-2 ring-primary/30" : ""
              }`}
              onClick={() => changeFilter(item.key)}
            >
              <div className="text-xs text-muted-foreground">{item.label}</div>

              <div className="mt-1 text-2xl font-bold tabular-nums">
                {item.count}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {filterOptions.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "default" : "outline"}
              onClick={() => changeFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1160px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Machine</th>

                <th className="px-4 py-3 text-left font-medium">Windows</th>

                <th className="px-4 py-3 text-left font-medium">
                  Current Build
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Latest Build
                </th>

                <th className="px-4 py-3 text-left font-medium">Latest KB</th>

                <th className="px-4 py-3 text-left font-medium">Behind</th>

                <th className="px-4 py-3 text-left font-medium">Status</th>

                <th className="px-4 py-3 text-center font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((device, index) => {
                const hardwareHref = getHardwareHref(device);

                const canOpen = hardwareHref !== "#";

                return (
                  <tr
                    key={device.agentId ?? device.hostname ?? `row-${index}`}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {device.hostname ?? device.agentId ?? "-"}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {device.ipAddress ?? "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {device.comparison.currentVersion ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums">
                      {device.comparison.currentBuild ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums">
                      {device.comparison.latestBuild ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {device.comparison.latestKb ?? "-"}
                    </td>

                    <td className="px-4 py-3 tabular-nums">
                      {device.comparison.revisionsBehind ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {statusBadge(device.comparison.status)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {canOpen ? (
                        <Link href={hardwareHref}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            ดูข้อมูลเครื่อง
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          ดูข้อมูลเครื่อง
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    ไม่มีข้อมูลสำหรับสถานะนี้
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{rangeStart}</span> -{" "}
            <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
            <span className="font-medium text-foreground">{rows.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="min-w-[100px] text-center text-sm">
              Page {currentPage} / {totalPages}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          สถานะนี้คำนวณจาก Windows Version + Build ของเครื่อง เทียบกับ Microsoft
          baseline
        </div>

        <div className="text-xs text-muted-foreground">
          Last checked: {formatCheckedAt(payload?.generatedOn)}
        </div>
      </CardContent>
    </Card>
  );
}
