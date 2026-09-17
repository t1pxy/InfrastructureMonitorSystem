import { NextResponse } from "next/server";
import { getAllCctv } from "@/lib/hikvision/query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getAllCctv();
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      summary: {
        total: data.length,
        online: data.filter((camera) => camera.status === "ONLINE").length,
        offline: data.filter((camera) => camera.status === "OFFLINE").length,
        unknown: data.filter((camera) => camera.status === "UNKNOWN").length,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[GET /api/cctv]", error);
    return NextResponse.json({
      success: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : "Failed to load CCTV",
    }, { status: 500 });
  }
}
