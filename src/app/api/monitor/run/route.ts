import { NextResponse } from "next/server";
import { runHikvisionMonitor } from "@/lib/hikvision/monitor";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const secret = process.env.HIKVISION_MONITOR_SECRET;

    /*
     * If a secret is configured,
     * require it from the worker.
     */
    if (secret) {
      const provided = request.headers.get("x-monitor-secret");

      if (provided !== secret) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
          },
          {
            status: 401,
          },
        );
      }
    }

    const result = await runHikvisionMonitor();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,

      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[GET /api/monitor/run]", error);

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Monitor execution failed",
      },
      {
        status: 500,
      },
    );
  }
}
