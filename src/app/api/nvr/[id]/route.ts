import { NextResponse } from "next/server";
import { getNvrDetail } from "@/lib/hikvision/query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    const data = await getNvrDetail(id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          nvr: null,
          cameras: [],
          error: "NVR not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        nvr: data.nvr,
        cameras: data.cameras,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("[GET /api/nvr/:id]", error);

    return NextResponse.json(
      {
        success: false,
        nvr: null,
        cameras: [],
        error: error instanceof Error ? error.message : "Failed to load NVR",
      },
      {
        status: 500,
      },
    );
  }
}
