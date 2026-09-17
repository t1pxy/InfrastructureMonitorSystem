import { NextRequest, NextResponse } from "next/server";

import { getHardwareList } from "@/lib/hardware/query";

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
    const params =
      request.nextUrl.searchParams;

    const type =
      parseType(
        params.get("type"),
      );

    const search =
      params.get("search") ??
      "";

    const data =
      await getHardwareList({
        type,
        search,
      });

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      type,
    });
  } catch (error) {
    console.error(
      "[GET /api/hardware]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        type: "ALL",
        error:
          error instanceof Error
            ? error.message
            : "Failed to load hardware",
      },
      {
        status: 500,
      },
    );
  }
}