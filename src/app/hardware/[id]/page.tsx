import Link from "next/link";

import {
  ArrowLeft,
  HardDrive,
  Laptop,
  Monitor,
  Network,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import HardwarePerformancePanel from "@/components/hardware/HardwarePerformancePanel";
import HardwareStatusBadge from "@/components/hardware/HardwareStatusBadge";
import HardwareInventoryPanel from "@/components/hardware/HardwareInventoryPanel";

import { getHardwareById } from "@/lib/hardware/query";

interface HardwareDetailPageProps {
  params: Promise<{
    id: string;
  }>;
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-medium">
        {value !== null && value !== undefined && String(value).trim() !== ""
          ? value
          : "-"}
      </div>
    </div>
  );
}

export default async function HardwareDetailPage({
  params,
}: HardwareDetailPageProps) {
  const { id } = await params;

  const decodedId = decodeURIComponent(id);

  const hardware = await getHardwareById(decodedId);

  if (!hardware) {
    return (
      <div className="space-y-6">
        <Link href="/hardware">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="rounded-xl border bg-background p-8 text-center">
          <h1 className="text-xl font-semibold">Hardware not found</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Cannot find device: {decodedId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hardware">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {hardware.hostname}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">{hardware.id}</p>
          </div>
        </div>

        <HardwareStatusBadge status={hardware.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">Device Type</div>

              <div className="font-semibold">{hardware.deviceClass}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">IP Address</div>

              <div className="font-semibold">{hardware.ipAddress || "-"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">Disk</div>

              <div className="font-semibold">
                {hardware.disk !== null ? `${hardware.disk.toFixed(0)}%` : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Laptop className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">Windows</div>

              <div className="font-semibold">
                {hardware.windowsVersion || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <HardwarePerformancePanel
        agentId={hardware.id}
        initial={
          hardware.performanceAt
            ? {
                recordedAt: hardware.performanceAt,

                cpu: hardware.cpu,

                memory: hardware.memory,

                memoryUsedGb: hardware.memoryUsedGb,

                memoryTotalGb: hardware.memoryTotalGb,

                disk: hardware.disk,

                diskUsedGb: hardware.diskUsedGb,

                diskTotalGb: hardware.diskTotalGb,
              }
            : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border bg-background">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />

              <h2 className="font-semibold">Hardware Information</h2>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2">
            <InfoItem label="Machine Name" value={hardware.hostname} />

            <InfoItem label="Manufacturer" value={hardware.manufacturer} />

            <InfoItem label="Model" value={hardware.model} />

            <InfoItem label="Serial Number" value={hardware.serialNumber} />

            <InfoItem label="CPU" value={hardware.cpuName} />

            <InfoItem
              label="RAM"
              value={
                hardware.memoryTotalGb !== null
                  ? `${hardware.memoryTotalGb.toFixed(1)} GB`
                  : null
              }
            />

            <InfoItem
              label="Disk"
              value={
                hardware.diskTotalGb !== null
                  ? `${hardware.diskTotalGb.toFixed(1)} GB`
                  : null
              }
            />

            <InfoItem label="Agent Version" value={hardware.agentVersion} />
          </div>
        </div>

        <div className="rounded-xl border bg-background">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />

              <h2 className="font-semibold">User & Location</h2>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2">
            <InfoItem label="User" value={hardware.user} />

            <InfoItem label="Department" value={hardware.department} />

            <InfoItem label="Location" value={hardware.location} />

            <InfoItem label="IP Address" value={hardware.ipAddress} />

            <InfoItem label="Windows" value={hardware.windowsVersion} />

            <InfoItem label="Build" value={hardware.windowsBuild} />

            <InfoItem
              label="Last Contact"
              value={formatDate(hardware.lastContact)}
            />

            <InfoItem
              label="Performance Sample"
              value={formatDate(hardware.performanceAt)}
            />
          </div>
        </div>
      </div>
      <HardwareInventoryPanel agentId={hardware.id} />
    </div>
  );
}