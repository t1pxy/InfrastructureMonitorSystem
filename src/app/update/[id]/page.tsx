"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Laptop,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

import UpdateHistoryTable from "@/components/windows-update/UpdateHistoryTable";
import UpdateStatusBadge from "@/components/windows-update/UpdateStatusBadge";

import type {
  WindowsUpdateDetailResponse,
} from "@/types/windows-update";

interface Props {
  params: Promise<{
    id: string;
  }>;
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

  return date.toLocaleString(
    "th-TH",
    {
      timeZone:
        "Asia/Bangkok",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",

      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function UpdateDetailPage({
  params,
}: Props) {
  const [agentId, setAgentId] =
    useState("");

  const [data, setData] =
    useState<
      WindowsUpdateDetailResponse["data"] | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const resolved =
          await params;

        const id =
          decodeURIComponent(
            resolved.id,
          );

        if (!cancelled) {
          setAgentId(id);
        }

        const response =
          await fetch(
            `/api/update/${encodeURIComponent(
              id,
            )}?limit=500`,
            {
              cache:
                "no-store",
            },
          );

        const json =
          (await response.json()) as WindowsUpdateDetailResponse;

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.error ||
              "Failed to load update history",
          );
        }

        if (!cancelled) {
          setData(
            json.data,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load update history",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />

        <div className="h-32 animate-pulse rounded-xl border bg-muted/30" />

        <div className="h-96 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    );
  }

  if (error || !data?.device) {
    return (
      <div className="space-y-6">
        <Link href="/update">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="rounded-xl border bg-background p-8 text-center">
          <h1 className="text-xl font-semibold">
            Update data not found
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error ||
              `Cannot find device ${agentId}`}
          </p>
        </div>
      </div>
    );
  }

  const device =
    data.device;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <Link href="/update">
            <Button
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              {device.hostname}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {device.agentId}
            </p>
          </div>
        </div>

        <UpdateStatusBadge
          status={
            device.inventoryState
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Laptop className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">
                Windows
              </div>

              <div className="font-semibold">
                {device.windowsVersion ||
                  "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">
                Update Records
              </div>

              <div className="font-semibold">
                {
                  device.updateCount
                }
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />

            <div>
              <div className="text-xs text-muted-foreground">
                Latest Update
              </div>

              <div className="font-semibold">
                {
                  device.latestUpdateId ||
                  "-"
                }
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div>
            <div className="text-xs text-muted-foreground">
              Latest Install Date
            </div>

            <div className="mt-2 font-semibold">
              {formatDate(
                device.latestUpdateDate,
              )}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {device.daysSinceLatestUpdate ===
              null
                ? "-"
                : `${device.daysSinceLatestUpdate} days ago`}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Install State is shown exactly as reported by the
        StarCat database. Pending / Failed / Reboot Required
        are not inferred from that integer.
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            Update History
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Updates reported for this machine.
          </p>
        </div>

        <UpdateHistoryTable
          rows={data.updates}
        />
      </div>
    </div>
  );
}