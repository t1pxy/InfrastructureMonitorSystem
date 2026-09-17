"use client";

import { useEffect, useState } from "react";

import {
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  HardwareInventory,
  HardwareInventoryResponse,
} from "@/types/hardware";

interface Props {
  agentId: string;
}

function formatGb(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)} GB`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(0)}%`;
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
    second: "2-digit",
  });
}

function InfoItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0">
      {" "}
      <p className="text-[11px] text-muted-foreground">{label} </p>
      <p className="mt-1 break-words text-sm font-medium">
        {value === null || value === undefined || value === ""
          ? "-"
          : String(value)}
      </p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-background shadow-sm">
      {" "}
      <div className="flex items-center gap-2 border-b px-5 py-4">
        {" "}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function HardwareInventoryPanel({ agentId }: Props) {
  const [inventory, setInventory] = useState<HardwareInventory | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  async function load(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/hardware/${encodeURIComponent(agentId)}/inventory`,
        {
          cache: "no-store",
        },
      );

      const json = (await response.json()) as HardwareInventoryResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load hardware inventory.");
      }

      setInventory(json.data);
    } catch (error) {
      console.error("[HardwareInventory]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [agentId]);

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-xl border bg-muted/30"
          />
        ))}{" "}
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="rounded-xl border bg-background p-6 text-center">
        {" "}
        <p className="text-sm text-muted-foreground">
          ไม่พบข้อมูล Hardware Inventory{" "}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void load(true)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-lg font-semibold">Hardware Inventory </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            รายละเอียด Hardware ที่ StarCat ตรวจพบ
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Processor" icon={Cpu}>
          {inventory.cpu.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CPU inventory</p>
          ) : (
            <div className="space-y-3">
              {inventory.cpu.map((cpu, index) => (
                <div
                  key={`${cpu.name}-${index}`}
                  className="rounded-lg border bg-muted/20 p-4"
                >
                  <p className="text-sm font-medium">{cpu.name ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Memory" icon={MemoryStick}>
          {inventory.memory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memory inventory</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Slot</th>

                    <th className="pb-3 pr-4 font-medium">Capacity</th>

                    <th className="pb-3 font-medium">Speed</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {inventory.memory.map((memory, index) => (
                    <tr key={`${memory.deviceLocator}-${index}`}>
                      <td className="py-3 pr-4">
                        {memory.deviceLocator ?? "-"}
                      </td>

                      <td className="py-3 pr-4 font-medium">
                        {formatGb(memory.capacityGb)}
                      </td>

                      <td className="py-3">
                        {memory.speed !== null ? `${memory.speed} MHz` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Disk Inventory" icon={HardDrive}>
          {inventory.disks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disk inventory</p>
          ) : (
            <div className="space-y-3">
              {inventory.disks.map((disk, index) => (
                <div
                  key={`${disk.id}-${index}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {disk.drive ?? disk.mountPoint ?? "Disk"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {disk.label ?? "No label"}
                      </p>
                    </div>

                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {formatPercent(disk.usedPercent)}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, disk.usedPercent ?? 0),
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <InfoItem
                      label="Capacity"
                      value={formatGb(disk.capacityGb)}
                    />

                    <InfoItem label="Free" value={formatGb(disk.freeSpaceGb)} />

                    <InfoItem label="Serial" value={disk.serialNumber} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Network" icon={Network}>
          {inventory.network.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No network inventory
            </p>
          ) : (
            <div className="space-y-3">
              {inventory.network.map((network, index) => (
                <div
                  key={`${network.id}-${index}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {network.networkName ??
                        network.netType ??
                        "Network Adapter"}
                    </p>

                    <span className="text-xs text-muted-foreground">
                      {network.macAddress ?? "-"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <InfoItem label="IP Address" value={network.ipAddress} />

                    <InfoItem label="Subnet" value={network.subnetMask} />

                    <InfoItem label="Gateway" value={network.gateway} />

                    <InfoItem label="DHCP" value={network.dhcp} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Operating System" icon={ShieldCheck}>
          {!inventory.os ? (
            <p className="text-sm text-muted-foreground">No OS inventory</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoItem label="Platform" value={inventory.os.platform} />

              <InfoItem label="Version" value={inventory.os.version} />

              <InfoItem label="Full Version" value={inventory.os.versionFull} />

              <InfoItem label="Build" value={inventory.os.build} />

              <InfoItem label="UBR" value={inventory.os.ubr} />

              <InfoItem label="Service Pack" value={inventory.os.servicePack} />

              <InfoItem label="Language" value={inventory.os.languageName} />

              <InfoItem
                label="Install Date"
                value={formatDate(inventory.os.installDate)}
              />

              <InfoItem
                label="Windows Folder"
                value={inventory.os.windowsFolder}
              />

              <InfoItem
                label="System Folder"
                value={inventory.os.systemFolder}
              />
            </div>
          )}
        </Panel>

        <Panel title="System / Mainboard" icon={Server}>
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                System
              </p>

              {inventory.system ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <InfoItem
                    label="Manufacturer"
                    value={inventory.system.manufacturer}
                  />

                  <InfoItem label="Model" value={inventory.system.model} />

                  <InfoItem label="Version" value={inventory.system.version} />

                  <InfoItem label="Serial" value={inventory.system.serial} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No system inventory
                </p>
              )}
            </div>

            <div className="border-t pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mainboard
              </p>

              {inventory.mainboard ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <InfoItem
                    label="Manufacturer"
                    value={inventory.mainboard.manufacturer}
                  />

                  <InfoItem label="Model" value={inventory.mainboard.model} />

                  <InfoItem label="Serial" value={inventory.mainboard.serial} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No mainboard inventory
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>
      {inventory.equipment.length > 0 ? (
        <Panel title="Equipment" icon={Server}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Device</th>

                  <th className="pb-3 pr-4 font-medium">Serial</th>

                  <th className="pb-3 pr-4 font-medium">Type ID</th>

                  <th className="pb-3 font-medium">Description</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {inventory.equipment.map((equipment, index) => (
                  <tr key={`${equipment.deviceName}-${index}`}>
                    <td className="py-3 pr-4 font-medium">
                      {equipment.deviceName ?? "-"}
                    </td>

                    <td className="py-3 pr-4">
                      {equipment.serialNumber ?? "-"}
                    </td>

                    <td className="py-3 pr-4">
                      {equipment.equipmentTypeId ?? "-"}
                    </td>

                    <td className="py-3">{equipment.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
