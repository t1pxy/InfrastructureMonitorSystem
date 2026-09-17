import { NextRequest, NextResponse } from "next/server";

import {
  getDashboardPerformance,
  type DashboardPerformanceRange,
} from "@/lib/dashboard/performance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseRange(value: string | null): DashboardPerformanceRange {
  if (value === "1h" || value === "7d") return value;
  return "24h";
}

export async function GET(request: NextRequest) {
  try {
    const range = parseRange(request.nextUrl.searchParams.get("range"));
    const data = await getDashboardPerformance(range);

    return NextResponse.json(
      {
        success: true,
        range,
        data,
        latest: data.at(-1) ?? null,
        count: data.length,
        generatedOn: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (error) {
    console.error("[GET /api/dashboard/performance] failed:", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        latest: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard performance data.",
      },
      { status: 500 },
    );
  }
}
