import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/hikvision/monitor";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runMonitor();

    return NextResponse.json({
      success: true,
      ...result,
    });
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
