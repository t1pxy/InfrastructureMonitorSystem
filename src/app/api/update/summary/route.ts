import { NextResponse } from "next/server";

import { getWindowsUpdateSummary } from "@/lib/windows-update/query";

export async function GET() {
  try {
    const data = await getWindowsUpdateSummary();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[GET /api/update/summary]", error);

    return NextResponse.json(
      {
        success: false,

        data: {
          totalDevices: 0,
          devicesWithUpdates: 0,
          devicesWithoutUpdates: 0,
          totalUpdateRecords: 0,
          staleInventory: 0,
          latestUpdateDate: null,
        },

        error:
          error instanceof Error
            ? error.message
            : "Failed to load update summary",
      },
      {
        status: 500,
      },
    );
  }
}
