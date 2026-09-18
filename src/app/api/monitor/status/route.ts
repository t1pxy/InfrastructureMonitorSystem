import { NextResponse } from "next/server";

import { readMonitorState } from "@/lib/hikvision/monitor-state";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export async function GET() {
  try {
    const state = await readMonitorState();

    return NextResponse.json(
      {
        success: true,
        data: state,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/monitor/status]", error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load monitor status",
      },
      {
        status: 500,
      },
    );
  }
}
