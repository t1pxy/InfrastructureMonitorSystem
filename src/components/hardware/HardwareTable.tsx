"use client";

import Link from "next/link";
import {
  Cpu,
  Eye,
  HardDrive,
  MemoryStick,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import HardwareStatusBadge from "./HardwareStatusBadge";

import type { Hardware } from "@/types/hardware";

interface HardwareTableProps {
  rows: Hardware[];
  page: number;
  pageSize: number;
  loading?: boolean;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGb(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} GB`;
}

function getBarClass(value: number) {
  if (value >= 90) {
    return "bg-red-500";
  }

  if (value >= 80) {
    return "bg-amber-500";
  }

  return "bg-primary";
}

function ResourceItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: number | null;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
        </div>

        <span className="shrink-0 text-[11px] font-semibold">
          {value === null ? "-" : `${value.toFixed(0)}%`}
        </span>
      </div>

      {value !== null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${getBarClass(value)}`}
            style={{
              width: `${Math.min(
                100,
                Math.max(0, value),
              )}%`,
            }}
          />
        </div>
      )}

      {detail && (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}

export default function HardwareTable({
  rows,
  page,
  pageSize,
  loading = false,
}: HardwareTableProps) {
  const start = (page - 1) * pageSize;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="h-[520px] animate-pulse bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-background">
      <table className="w-full table-fixed text-xs">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[15%] px-3 py-3 text-left font-semibold">
              Machine
            </th>

            <th className="w-[9%] px-2 py-3 text-left font-semibold">
              Type / IP
            </th>

            <th className="w-[22%] px-3 py-3 text-left font-semibold">
              Resources
            </th>

            <th className="w-[12%] px-3 py-3 text-left font-semibold">
              Windows
            </th>

            <th className="w-[13%] px-3 py-3 text-left font-semibold">
              User / Dept
            </th>

            <th className="w-[10%] px-3 py-3 text-left font-semibold">
              Location
            </th>

            <th className="w-[9%] px-3 py-3 text-left font-semibold">
              Updated
            </th>

            <th className="w-[7%] px-2 py-3 text-center font-semibold">
              Status
            </th>

            <th className="w-[3%] px-2 py-3 text-right font-semibold">
              {" "}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="h-40 text-center text-muted-foreground"
              >
                No hardware found
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowKey =
                row.id ||
                row.hostname ||
                `hardware-${start + index}`;

              return (
                <tr
                  key={rowKey}
                  className="align-middle transition-colors hover:bg-muted/30"
                >
                  {/* Machine */}
                  <td className="px-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/hardware/${encodeURIComponent(row.id)}`}
                        className="block truncate font-semibold hover:underline"
                        title={row.hostname}
                      >
                        {row.hostname}
                      </Link>

                      {row.model && (
                        <div
                          className="mt-1 truncate text-[11px] text-muted-foreground"
                          title={row.model}
                        >
                          {row.model}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Type / IP */}
                  <td className="px-2 py-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-md bg-muted px-1.5 py-1 text-[10px] font-semibold">
                        {row.deviceClass}
                      </span>

                      <div
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={row.ipAddress || ""}
                      >
                        {row.ipAddress || "-"}
                      </div>
                    </div>
                  </td>

                  {/* Resources */}
                  <td className="px-3 py-3">
                    <div className="space-y-2">
                      <ResourceItem
                        icon={Cpu}
                        label="CPU"
                        value={row.cpu}
                        detail={
                          row.cpuName || undefined
                        }
                      />

                      <ResourceItem
                        icon={MemoryStick}
                        label="RAM"
                        value={row.memory}
                        detail={
                          row.memoryTotalGb !== null
                            ? `${formatGb(
                                row.memoryUsedGb,
                              )} / ${formatGb(
                                row.memoryTotalGb,
                              )}`
                            : undefined
                        }
                      />

                      <ResourceItem
                        icon={HardDrive}
                        label="Disk"
                        value={row.disk}
                        detail={
                          row.diskTotalGb !== null
                            ? `${formatGb(
                                row.diskUsedGb,
                              )} / ${formatGb(
                                row.diskTotalGb,
                              )}`
                            : undefined
                        }
                      />
                    </div>
                  </td>

                  {/* Windows */}
                  <td className="px-3 py-3">
                    <div className="min-w-0">
                      <div
                        className="truncate font-medium"
                        title={row.windowsVersion || ""}
                      >
                        {row.windowsVersion || "-"}
                      </div>

                      {row.windowsBuild && (
                        <div className="mt-1 truncate text-[11px] text-muted-foreground">
                          Build {row.windowsBuild}
                        </div>
                      )}

                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Update: {row.windowsUpdate}
                      </div>
                    </div>
                  </td>

                  {/* User / Department */}
                  <td className="px-3 py-3">
                    <div className="min-w-0">
                      <div
                        className="truncate font-medium"
                        title={row.user}
                      >
                        {row.user || "-"}
                      </div>

                      <div
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={row.department}
                      >
                        {row.department || "-"}
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-3 py-3">
                    <div
                      className="truncate text-[11px] text-muted-foreground"
                      title={row.location || ""}
                    >
                      {row.location || "-"}
                    </div>
                  </td>

                  {/* Updated */}
                  <td className="px-3 py-3">
                    <div className="text-[11px]">
                      {formatDate(
                        row.performanceAt ||
                          row.lastContact,
                      )}
                    </div>

                    {row.performanceAgeSeconds !== null && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {row.performanceAgeSeconds < 60
                          ? "Just now"
                          : `${Math.floor(
                              row.performanceAgeSeconds / 60,
                            )} min ago`}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-2 py-3 text-center">
                    <HardwareStatusBadge
                      status={row.status}
                    />
                  </td>

                  {/* Action */}
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/hardware/${encodeURIComponent(row.id)}`}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="View details"
                        className="h-8 w-8"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}