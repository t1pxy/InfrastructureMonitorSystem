"use client";

import {
  AlertTriangle,
  Database,
  Laptop,
  MonitorCheck,
  Server,
} from "lucide-react";

import type {
  WindowsUpdateSummary,
} from "@/types/windows-update";

interface Props {
  summary: WindowsUpdateSummary;
  loading?: boolean;
}

function Card({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
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

          <div className="mt-2 text-3xl font-bold">
            {value}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "th-TH",
    {
      timeZone:
        "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

export default function UpdateSummary({
  summary,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({
          length: 5,
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card
        title="Devices"
        value={
          summary.totalDevices
        }
        description="Desktop + Notebook"
        icon={Server}
      />

      <Card
        title="With Updates"
        value={
          summary.devicesWithUpdates
        }
        description="Devices reporting updates"
        icon={MonitorCheck}
      />

      <Card
        title="No Update Data"
        value={
          summary.devicesWithoutUpdates
        }
        description="No update records"
        icon={Laptop}
      />

      <Card
        title="Update Records"
        value={
          summary.totalUpdateRecords
        }
        description="Total inventory records"
        icon={Database}
      />

      <Card
        title="Stale Inventory"
        value={
          summary.staleInventory
        }
        description={`Latest record older than 30 days`}
        icon={AlertTriangle}
      />

      <div className="md:col-span-2 xl:col-span-5 rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Latest update inventory:
        {" "}
        <span className="font-medium text-foreground">
          {formatDate(
            summary.latestUpdateDate,
          )}
        </span>
      </div>
    </div>
  );
}