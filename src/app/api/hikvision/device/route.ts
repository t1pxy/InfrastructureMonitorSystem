import { NextResponse } from "next/server";
import { getNvrConfig } from "@/lib/hikvision/config";
import { hikvisionRequestRaw } from "@/lib/hikvision/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const METHODS = new Set(["GET", "POST", "PUT", "DELETE"]);
const ALLOWED_PREFIX = "/ISAPI/";

function getBaseUrl(nvr: { host: string; port?: number; protocol?: "http" | "https" }) {
  const protocol = nvr.protocol || "http";
  return protocol + "://" + nvr.host + ":" + (nvr.port || (protocol === "https" ? 443 : 80));
}

function safePath(value: unknown) {
  const path = String(value ?? "").trim();
  if (!path.startsWith(ALLOWED_PREFIX) || path.includes("://") || path.includes("\\")) {
    throw new Error("Only Hikvision /ISAPI/ endpoints are allowed.");
  }
  return path;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { nvrId?: string; method?: string; path?: string; body?: string };
    const nvrId = String(body.nvrId ?? "").trim();
    const method = String(body.method ?? "GET").toUpperCase() as "GET" | "POST" | "PUT" | "DELETE";
    const path = safePath(body.path);

    if (!nvrId) return NextResponse.json({ success: false, error: "NVR ID is required." }, { status: 400 });
    if (!METHODS.has(method)) return NextResponse.json({ success: false, error: "Unsupported HTTP method." }, { status: 400 });

    const nvr = getNvrConfig(nvrId);
    if (!nvr) return NextResponse.json({ success: false, error: "NVR not found." }, { status: 404 });

    if ((method === "POST" || method === "PUT") && !String(body.body ?? "").trim()) {
      return NextResponse.json({ success: false, error: "Request body is required for this method." }, { status: 400 });
    }

    const result = await hikvisionRequestRaw(
      getBaseUrl(nvr),
      nvr.username,
      nvr.password,
      method,
      path,
      method === "GET" ? undefined : String(body.body ?? ""),
    );

    return NextResponse.json({
      success: true,
      data: { status: result.status, path, method, body: result.body },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Hikvision management request failed.",
    }, { status: 502 });
  }
}
