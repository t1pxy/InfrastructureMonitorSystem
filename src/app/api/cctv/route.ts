import { NextResponse } from "next/server";
import { getAllCctv } from "@/lib/hikvision/query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getAllCctv();

    const online = data.filter((camera) => camera.status === "ONLINE").length;

    const offline = data.filter((camera) => camera.status === "OFFLINE").length;

    const unknown = data.filter((camera) => camera.status === "UNKNOWN").length;

    return NextResponse.json(
      {
        success: true,

        data,

        count: data.length,

        summary: {
          total: data.length,

          online,

          offline,

          unknown,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/cctv]", error);

    return NextResponse.json(
      {
        success: false,

        data: [],

        count: 0,

        summary: {
          total: 0,
          online: 0,
          offline: 0,
          unknown: 0,
        },

        error: error instanceof Error ? error.message : "Failed to load CCTV",
      },
      {
        status: 500,

        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  }
}
