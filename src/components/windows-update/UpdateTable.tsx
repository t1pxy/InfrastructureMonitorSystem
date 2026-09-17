"use client";

import Link from "next/link";

import {
  Eye,
  Monitor,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import UpdateStatusBadge from "./UpdateStatusBadge";

import type {
  WindowsUpdateDevice,
} from "@/types/windows-update";

interface Props {
  rows: WindowsUpdateDevice[];
  loading?: boolean;
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

export default function UpdateTable({
  rows,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="h-[460px] animate-pulse bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-background">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[18%] px-4 py-3 text-left font-semibold">
              Machine
            </th>

            <th className="w-[12%] px-3 py-3 text-left font-semibold">
              Type
            </th>

            <th className="w-[16%] px-3 py-3 text-left font-semibold">
              Windows
            </th>

            <th className="w-[15%] px-3 py-3 text-center font-semibold">
              Updates
            </th>

            <th className="w-[16%] px-3 py-3 text-left font-semibold">
              Latest Update
            </th>

            <th className="w-[10%] px-3 py-3 text-center font-semibold">
              Age
            </th>

            <th className="w-[9%] px-3 py-3 text-center font-semibold">
              Inventory
            </th>

            <th className="w-[4%] px-2 py-3" />
          </tr>
        </thead>

        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="h-40 text-center text-muted-foreground"
              >
                No Windows Update data found
              </td>
            </tr>
          ) : (
            rows.map(
              (row) => (
                <tr
                  key={row.agentId}
                  className="hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/update/${encodeURIComponent(
                        row.agentId,
                      )}`}
                      className="font-semibold hover:underline"
                    >
                      {row.hostname}
                    </Link>

                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {row.agentId}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {row.deviceClass ===
                      "NOTEBOOK"
                        ? "Notebook"
                        : "Desktop"}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <div className="truncate">
                      {row.windowsVersion ||
                        "-"}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />

                      <span className="font-semibold">
                        {row.updateCount}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="text-xs">
                      {formatDate(
                        row.latestUpdateDate,
                      )}
                    </div>

                    {row.latestUpdateId && (
                      <div className="mt-1 truncate text-xs font-medium text-muted-foreground">
                        {row.latestUpdateId}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    {row.daysSinceLatestUpdate ===
                    null
                      ? "-"
                      : `${row.daysSinceLatestUpdate} d`}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <UpdateStatusBadge
                      status={
                        row.inventoryState
                      }
                    />
                  </td>

                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/update/${encodeURIComponent(
                        row.agentId,
                      )}`}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="View update history"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  );
}