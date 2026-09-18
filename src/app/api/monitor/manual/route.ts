import { NextResponse } from "next/server";
import { runHikvisionMonitor } from "@/lib/hikvision/monitor";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runHikvisionMonitor();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Monitor check failed",
      },
      { status: 500 },
    );
  }
}
