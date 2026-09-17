"use client";

import type {
  WindowsUpdateRecord,
} from "@/types/windows-update";

interface Props {
  rows: WindowsUpdateRecord[];
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

export default function UpdateHistoryTable({
  rows,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">
                Update ID
              </th>

              <th className="px-4 py-3 text-left font-semibold">
                Product
              </th>

              <th className="px-4 py-3 text-left font-semibold">
                Publisher
              </th>

              <th className="px-4 py-3 text-left font-semibold">
                Install Date
              </th>

              <th className="px-4 py-3 text-center font-semibold">
                Install State
              </th>

              <th className="px-4 py-3 text-center font-semibold">
                Uninstallable
              </th>

              <th className="px-4 py-3 text-left font-semibold">
                More Info
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No update records
                </td>
              </tr>
            ) : (
              rows.map(
                (row) => (
                  <tr
                    key={`${row.agentId}-${row.updateId}`}
                    className="hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {row.updateId}
                    </td>

                    <td className="px-4 py-3">
                      {row.parentDisplayName ||
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      {row.publisher ||
                        "-"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(
                        row.installDate,
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.installState ??
                        "-"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.uninstallable ||
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      {row.moreInfoUrl ? (
                        <a
                          href={
                            row.moreInfoUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium underline"
                        >
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}