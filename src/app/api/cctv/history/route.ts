import { NextResponse } from "next/server";
import { getOfflineHistory } from "@/lib/hikvision/offline-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const nvrId = url.searchParams.get("nvrId") || undefined;
    const status = url.searchParams.get("status") as "ALL" | "ONGOING" | "RECOVERED" | null;
    const data = getOfflineHistory({ nvrId, status: status ?? "ALL" });
    return NextResponse.json(
      { success: true, data, count: data.length },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: [], count: 0, error: error instanceof Error ? error.message : "Failed to load offline history" },
      { status: 500 },
    );
  }
}
