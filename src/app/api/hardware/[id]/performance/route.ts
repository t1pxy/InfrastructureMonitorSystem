import { NextRequest, NextResponse } from "next/server";

import {
  getHardwarePerformance,
  type PerformanceRange,
} from "@/lib/hardware/performance";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function parseRange(value: string | null): PerformanceRange {
  if (value === "1h" || value === "7d" || value === "14d" || value === "30d") {
    return value;
  }

  return "24h";
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);

    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") ?? 60,
    );

    const limit = Number.isFinite(requestedLimit)
      ? requestedLimit
      : 60;

    const range = parseRange(
      request.nextUrl.searchParams.get("range"),
    );

    const data = await getHardwarePerformance(
      decodedId,
      limit,
      range,
    );

    return NextResponse.json({
      success: true,
      data,
      range,
      latest: data.length > 0 ? data[data.length - 1] : null,
    });
  } catch (error) {
    console.error("[GET /api/hardware/:id/performance]", error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        latest: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load performance",
      },
      { status: 500 },
    );
  }
}
