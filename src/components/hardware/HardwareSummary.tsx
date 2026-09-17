"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Server,
  WifiOff,
} from "lucide-react";

import type { HardwareSummary as HardwareSummaryType } from "@/types/hardware";

export type HardwareCardFilter =
  | "ALL"
  | "HEALTHY"
  | "WARNING"
  | "CRITICAL"
  | "OFFLINE"
  | "UNKNOWN"
  | "UPDATE_PENDING"
  | "NOTEBOOK";

interface HardwareSummaryProps {
  summary?: HardwareSummaryType | null;
  loading?: boolean;
  activeFilter?: HardwareCardFilter;
  onFilterChange?: (filter: HardwareCardFilter) => void;
}

const EMPTY_SUMMARY: HardwareSummaryType = {
  total: 0,
  healthy: 0,
  warning: 0,
  critical: 0,
  offline: 0,
  unknown: 0,
  updatePending: 0,
  desktop: 0,
  notebook: 0,
};

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  active,
  onClick,
}: {
  title: string;
  value: number;
  description?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  active?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  const content = (
    <div
      className={[
        "rounded-xl border bg-background p-5 shadow-sm transition-all",
        clickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          : "",
        active ? "border-primary ring-2 ring-primary/20" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>

          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>

          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div
          className={[
            "rounded-lg bg-muted p-2.5",
            active ? "bg-primary/10" : "",
          ].join(" ")}
        >
          <Icon
            className={[
              "h-5 w-5",
              active ? "text-primary" : "text-muted-foreground",
            ].join(" ")}
          />
        </div>
      </div>
    </div>
  );

  if (!clickable) {
    return content;
  }

  return (
    <button
      type="button"
      className="block w-full text-left"
      onClick={onClick}
      aria-pressed={active}
    >
      {content}
    </button>
  );
}

export default function HardwareSummary({
  summary,
  loading = false,
  activeFilter = "ALL",
  onFilterChange,
}: HardwareSummaryProps) {
  const safe = summary ?? EMPTY_SUMMARY;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total Devices"
        value={safe.total}
        icon={Server}
        description={`${safe.desktop} Desktop / ${safe.notebook} Notebook`}
        active={activeFilter === "ALL"}
        onClick={() => onFilterChange?.("ALL")}
      />

      <SummaryCard
        title="Healthy"
        value={safe.healthy}
        icon={CheckCircle2}
        active={activeFilter === "HEALTHY"}
        onClick={() => onFilterChange?.("HEALTHY")}
      />

      <SummaryCard
        title="Warning"
        value={safe.warning}
        icon={AlertTriangle}
        active={activeFilter === "WARNING"}
        onClick={() => onFilterChange?.("WARNING")}
      />

      <SummaryCard
        title="Critical"
        value={safe.critical}
        icon={AlertCircle}
        active={activeFilter === "CRITICAL"}
        onClick={() => onFilterChange?.("CRITICAL")}
      />

      <SummaryCard
        title="Offline"
        value={safe.offline}
        icon={WifiOff}
        active={activeFilter === "OFFLINE"}
        onClick={() => onFilterChange?.("OFFLINE")}
      />

      <SummaryCard
        title="Unknown"
        value={safe.unknown}
        icon={AlertCircle}
        active={activeFilter === "UNKNOWN"}
        onClick={() => onFilterChange?.("UNKNOWN")}
      />

      <SummaryCard
        title="Update Pending"
        value={safe.updatePending}
        icon={AlertTriangle}
        active={activeFilter === "UPDATE_PENDING"}
        onClick={() => onFilterChange?.("UPDATE_PENDING")}
      />

      <SummaryCard
        title="Notebook"
        value={safe.notebook}
        icon={Laptop}
        active={activeFilter === "NOTEBOOK"}
        onClick={() => onFilterChange?.("NOTEBOOK")}
      />
    </div>
  );
}