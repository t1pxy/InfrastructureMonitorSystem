"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Server,
  WifiOff,
} from "lucide-react";

import type {
  HardwareSummary as HardwareSummaryType,
} from "@/types/hardware";

interface HardwareSummaryProps {
  summary?: HardwareSummaryType | null;
  loading?: boolean;
}

const EMPTY_SUMMARY: HardwareSummaryType =
  {
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
}: {
  title: string;
  value: number;
  description?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function HardwareSummary({
  summary,
  loading = false,
}: HardwareSummaryProps) {
  const safe =
    summary ??
    EMPTY_SUMMARY;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 8,
        }).map((_, index) => (
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
      />

      <SummaryCard
        title="Healthy"
        value={safe.healthy}
        icon={CheckCircle2}
      />

      <SummaryCard
        title="Warning"
        value={safe.warning}
        icon={AlertTriangle}
      />

      <SummaryCard
        title="Critical"
        value={safe.critical}
        icon={AlertCircle}
      />

      <SummaryCard
        title="Offline"
        value={safe.offline}
        icon={WifiOff}
      />

      <SummaryCard
        title="Unknown"
        value={safe.unknown}
        icon={AlertCircle}
      />

      <SummaryCard
        title="Update Pending"
        value={safe.updatePending}
        icon={AlertTriangle}
      />

      <SummaryCard
        title="Notebook"
        value={safe.notebook}
        icon={Laptop}
      />
    </div>
  );
}