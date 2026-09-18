import { NextResponse } from "next/server";
import {
  deleteCameraConfig,
  deleteNvrConfig,
  getHikvisionConfigs,
  upsertCameraConfig,
  upsertNvrConfig,
} from "@/lib/hikvision/config";
import type { NvrConfig } from "@/types/nvr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const config = getHikvisionConfigs();
  return NextResponse.json({
    success: true,
    data: {
      nvrs: config.nvrs.map((nvr) => ({ ...nvr, password: "********" })),
      cameras: config.cameras,
    },
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type;

    if (type === "nvr") {
      const id = String(body.id ?? "").trim();
      const name = String(body.name ?? "").trim();
      const host = String(body.host ?? "").trim();
      const username = String(body.username ?? "").trim();
      const site = String(body.site ?? "").trim();

      if (!id || !name || !host || !username) {
        return NextResponse.json(
          { success: false, error: "NVR ID, name, host and username are required." },
          { status: 400 },
        );
      }

      const existing = getHikvisionConfigs().nvrs.find((nvr) => nvr.id === id);
      const password =
        typeof body.password === "string" && body.password.length > 0 && body.password !== "********"
          ? body.password
          : existing?.password ?? "";

      const portValue = Number(body.port ?? 80);
      const config: NvrConfig = {
        id,
        name,
        host,
        port: Number.isFinite(portValue) ? portValue : 80,
        username,
        password,
        site: site || undefined,
      };

      upsertNvrConfig(config);
      return NextResponse.json({ success: true, data: { ...config, password: "********" } });
    }

    if (type === "camera") {
      const nvrId = String(body.nvrId ?? "").trim();
      const channel = Number(body.channel);
      if (!nvrId || !Number.isInteger(channel) || channel < 1) {
        return NextResponse.json(
          { success: false, error: "NVR ID and valid camera channel are required." },
          { status: 400 },
        );
      }

      if (!getHikvisionConfigs().nvrs.some((nvr) => nvr.id === nvrId)) {
        return NextResponse.json(
          { success: false, error: "NVR not found." },
          { status: 404 },
        );
      }

      const camera = upsertCameraConfig({
        nvrId,
        channel,
        name: String(body.name ?? "").trim() || undefined,
        ipAddress:
          body.ipAddress === null || body.ipAddress === undefined
            ? undefined
            : String(body.ipAddress).trim() || null,
        enabled: body.enabled !== false,
      });

      return NextResponse.json({ success: true, data: camera });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported config type." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save configuration." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { type?: string; id?: string; nvrId?: string; channel?: number };

    if (body.type === "nvr" && body.id) {
      deleteNvrConfig(body.id);
      return NextResponse.json({ success: true });
    }

    if (body.type === "camera" && body.nvrId && Number.isInteger(body.channel)) {
      deleteCameraConfig(body.nvrId, Number(body.channel));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Valid NVR ID or camera NVR/channel is required." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete configuration." },
      { status: 500 },
    );
  }
}
