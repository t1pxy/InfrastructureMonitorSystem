import { NextRequest, NextResponse } from "next/server";

import { getWindowsUpdateDevices } from "@/lib/windows-update/query";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? "";

    const data = await getWindowsUpdateDevices(search);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      search,
    });
  } catch (error) {
    console.error("[GET /api/update]", error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        search: "",
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Windows Update data",
      },
      {
        status: 500,
      },
    );
  }
}
