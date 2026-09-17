import { NextRequest, NextResponse } from "next/server";

import {
  getHardwareSummary,
} from "@/lib/hardware/query";

import type {
  HardwareDeviceType,
} from "@/types/hardware";

function parseType(
  value: string | null,
): HardwareDeviceType {
  if (value === "DESKTOP") {
    return "DESKTOP";
  }

  if (value === "NOTEBOOK") {
    return "NOTEBOOK";
  }

  return "ALL";
}

export async function GET(
  request: NextRequest,
) {
  try {
    const type =
      parseType(
        request.nextUrl.searchParams.get(
          "type",
        ),
      );

    const data =
      await getHardwareSummary(
        type,
      );

    return NextResponse.json({
      success: true,
      data,
      type,
    });
  } catch (error) {
    console.error(
      "[GET /api/hardware/summary]",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        data: {
          total: 0,
          healthy: 0,
          warning: 0,
          critical: 0,
          offline: 0,
          unknown: 0,
          updatePending: 0,
          desktop: 0,
          notebook: 0,
        },

        type: "ALL",

        error:
          error instanceof Error
            ? error.message
            : "Failed to load summary",
      },
      {
        status: 500,
      },
    );
  }
}