import { NextResponse } from "next/server";

import {
  getHardwareById,
} from "@/lib/hardware/query";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    const decodedId =
      decodeURIComponent(id);

    const data =
      await getHardwareById(
        decodedId,
      );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          data: null,
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
      "[GET /api/hardware/:id]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        data: null,
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