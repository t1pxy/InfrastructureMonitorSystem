import { NextRequest, NextResponse } from "next/server";

import {
  getWindowsUpdateDetail,
} from "@/lib/windows-update/query";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    const agentId =
      decodeURIComponent(id);

    const requestedLimit =
      Number(
        request.nextUrl.searchParams.get(
          "limit",
        ) ?? 100,
      );

    const limit =
      Number.isFinite(
        requestedLimit,
      )
        ? requestedLimit
        : 100;

    const data =
      await getWindowsUpdateDetail(
        agentId,
        limit,
      );

    if (!data.device) {
      return NextResponse.json(
        {
          success: false,

          data: {
            device: null,
            updates: [],
          },

          error:
            "Hardware not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "[GET /api/update/:id]",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        data: {
          device: null,
          updates: [],
        },

        error:
          error instanceof Error
            ? error.message
            : "Failed to load update history",
      },
      {
        status: 500,
      },
    );
  }
}