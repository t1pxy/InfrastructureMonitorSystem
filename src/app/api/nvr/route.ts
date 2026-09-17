import { NextResponse } from "next/server";
import { getNvrList } from "@/lib/hikvision/query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getNvrList();
    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error("[GET /api/nvr]", error);
    return NextResponse.json(
      { success: false, data: [], count: 0, error: error instanceof Error ? error.message : "Failed to load NVRs" },
      { status: 500 },
    );
  }
}
