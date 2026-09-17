import { NextResponse } from "next/server";

import {
  GENERATED_ON,
  SOURCE_URL,
  WINDOWS_BUILDS,
} from "@/lib/windows-update/windows-releases";

export const dynamic = "force-dynamic";

export async function GET() {
  const latestByVersion = Object.fromEntries(
    Object.values(WINDOWS_BUILDS).map((item) => [
      item.featureVersion,
      item.revisions[0] ?? null,
    ]),
  );

  return NextResponse.json({
    source: SOURCE_URL,
    generatedOn: GENERATED_ON,
    latestByVersion,
    builds: WINDOWS_BUILDS,
  });
}
