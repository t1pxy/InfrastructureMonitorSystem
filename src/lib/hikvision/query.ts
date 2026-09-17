import { hikvisionRequest } from "@/lib/hikvision/client";
import type { Nvr, NvrCamera, NvrConfig, NvrStorage } from "@/types/nvr";

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || null;
}

function allBlocks(xml: string, name: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi"))).map((m) => m[1]);
}

function numberValue(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function gb(value: string | null): number | null {
  const n = numberValue(value);
  if (n === null) return null;
  return n > 1024 * 1024 * 1024 ? n / 1024 / 1024 / 1024 : n;
}

function configList(): NvrConfig[] {
  const raw = process.env.HIKVISION_NVR_CONFIG;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NvrConfig[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item.id && item.host && item.username);
  } catch {
    throw new Error("HIKVISION_NVR_CONFIG is not valid JSON.");
  }
}

function baseUrl(nvr: NvrConfig) {
  const protocol = process.env.HIKVISION_PROTOCOL || "http";
  const port = nvr.port ? `:${nvr.port}` : "";
  return `${protocol}://${nvr.host}${port}`;
}

async function getDeviceInfo(nvr: NvrConfig) {
  const xml = await hikvisionRequest(baseUrl(nvr), nvr.username, nvr.password, "/ISAPI/System/deviceInfo");
  return {
    model: tag(xml, "model"),
    serialNumber: tag(xml, "serialNumber"),
    firmware: tag(xml, "firmwareVersion") ?? tag(xml, "firmwareReleasedDate"),
  };
}

async function getCameras(nvr: NvrConfig): Promise<NvrCamera[]> {
  try {
    const xml = await hikvisionRequest(baseUrl(nvr), nvr.username, nvr.password, "/ISAPI/ContentMgmt/InputProxy/channels");
    const blocks = allBlocks(xml, "InputProxyChannel");
    return blocks.map((block, index) => {
      const channel = numberValue(tag(block, "id"));
      return {
        id: `${nvr.id}-${channel ?? index + 1}`,
        channel,
        name: tag(block, "name") ?? `Channel ${channel ?? index + 1}`,
        ipAddress: tag(block, "ipAddress") ?? tag(block, "addressingFormatType"),
        status: "UNKNOWN",
        lastChecked: null,
        error: null,
      };
    });
  } catch (error) {
    return [{
      id: `${nvr.id}-error`,
      channel: null,
      name: "Unable to read camera channels",
      ipAddress: null,
      status: "UNKNOWN",
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown Hikvision error",
    }];
  }
}

async function getCameraStatus(nvr: NvrConfig, cameras: NvrCamera[]) {
  try {
    const xml = await hikvisionRequest(baseUrl(nvr), nvr.username, nvr.password, "/ISAPI/ContentMgmt/InputProxy/channels/status");
    const blocks = allBlocks(xml, "InputProxyChannelStatus");
    const now = new Date().toISOString();
    return cameras.map((camera) => {
      const block = blocks.find((item) => numberValue(tag(item, "id")) === camera.channel);
      const status = tag(block ?? "", "online") ?? tag(block ?? "", "status");
      const online = status?.toLowerCase() === "true" || status === "1" || status?.toLowerCase() === "online";
      return { ...camera, status: block ? (online ? "ONLINE" : "OFFLINE") : camera.status, lastChecked: now } as NvrCamera;
    });
  } catch {
    return cameras.map((camera) => ({ ...camera, lastChecked: new Date().toISOString() }));
  }
}

async function getStorage(nvr: NvrConfig): Promise<NvrStorage[]> {
  try {
    const xml = await hikvisionRequest(baseUrl(nvr), nvr.username, nvr.password, "/ISAPI/ContentMgmt/Storage/hdd");
    return allBlocks(xml, "hdd").map((block, index) => ({
      id: tag(block, "id") ?? String(index + 1),
      name: tag(block, "name") ?? `HDD ${index + 1}`,
      status: tag(block, "status") ?? "UNKNOWN",
      capacityGb: gb(tag(block, "capacity")),
      freeGb: gb(tag(block, "freeSpace")),
    }));
  } catch {
    return [];
  }
}

export async function getNvrList(): Promise<Nvr[]> {
  const configs = configList();
  return Promise.all(configs.map(async (config) => {
    const checked = new Date().toISOString();
    try {
      const info = await getDeviceInfo(config);
      let cameras = await getCameras(config);
      cameras = await getCameraStatus(config, cameras);
      const storage = await getStorage(config);
      return {
        id: config.id,
        name: config.name,
        host: config.host,
        site: config.site ?? null,
        model: info.model,
        serialNumber: info.serialNumber,
        firmware: info.firmware,
        status: "ONLINE",
        lastChecked: checked,
        cameraCount: cameras.filter((camera) => camera.channel !== null).length,
        onlineCameraCount: cameras.filter((camera) => camera.status === "ONLINE").length,
        offlineCameraCount: cameras.filter((camera) => camera.status === "OFFLINE").length,
        storage,
        error: null,
      } satisfies Nvr;
    } catch (error) {
      return {
        id: config.id,
        name: config.name,
        host: config.host,
        site: config.site ?? null,
        model: null,
        serialNumber: null,
        firmware: null,
        status: "OFFLINE",
        lastChecked: checked,
        cameraCount: 0,
        onlineCameraCount: 0,
        offlineCameraCount: 0,
        storage: [],
        error: error instanceof Error ? error.message : "Unable to connect to NVR",
      } satisfies Nvr;
    }
  }));
}

export async function getNvrDetail(id: string) {
  const config = configList().find((item) => item.id === id);
  if (!config) return null;
  const list = await getNvrList();
  const nvr = list.find((item) => item.id === id) ?? null;
  if (!nvr) return null;
  let cameras = await getCameras(config);
  cameras = await getCameraStatus(config, cameras);
  return { nvr, cameras };
}
