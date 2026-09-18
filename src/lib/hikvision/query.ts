import { hikvisionRequest } from "@/lib/hikvision/client";
import type { Nvr, NvrCamera, NvrConfig, NvrStorage } from "@/types/nvr";
import { updateCameraStates } from "@/lib/hikvision/camera-state";
import { getCameraConfig, getHikvisionConfigs } from "@/lib/hikvision/config";

export function encodeNvrRouteId(id: string) {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeNvrRouteId(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );

  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || null;
}

function allBlocks(xml: string, name: string): string[] {
  return Array.from(
    xml.matchAll(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi"),
    ),
  ).map((match) => match[1]);
}

function numberValue(value: string | null): number | null {
  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * Hikvision storage values are not always returned in bytes.
 *
 * Common Hikvision NVR responses return capacity/freeSpace as MB.
 * Some devices may return byte-sized values.
 *
 * We use a heuristic:
 * - Very large values => bytes
 * - Normal HDD values such as 3815447 => MB
 */
function storageGb(value: string | null): number | null {
  const number = numberValue(value);

  if (number === null) {
    return null;
  }

  // Byte-sized values.
  if (number >= 1024 * 1024 * 1024) {
    return Math.round((number / 1024 / 1024 / 1024) * 100) / 100;
  }

  // Hikvision commonly reports storage in MB.
  return Math.round((number / 1024) * 100) / 100;
}

function configList(): NvrConfig[] {
  return getHikvisionConfigs().nvrs.filter((item) => item.id && item.host && item.username);
}
function baseUrl(nvr: NvrConfig) {
  const protocol = process.env.HIKVISION_PROTOCOL || "http";

  const port = nvr.port ? `:${nvr.port}` : "";

  return `${protocol}://${nvr.host}${port}`;
}

async function getDeviceInfo(nvr: NvrConfig) {
  const xml = await hikvisionRequest(
    baseUrl(nvr),
    nvr.username,
    nvr.password,
    "/ISAPI/System/deviceInfo",
  );

  return {
    model: tag(xml, "model"),
    serialNumber: tag(xml, "serialNumber"),
    firmware: tag(xml, "firmwareVersion") ?? tag(xml, "firmwareReleasedDate"),
  };
}

async function getCameras(nvr: NvrConfig): Promise<NvrCamera[]> {
  try {
    const xml = await hikvisionRequest(
      baseUrl(nvr),
      nvr.username,
      nvr.password,
      "/ISAPI/ContentMgmt/InputProxy/channels",
    );

    const blocks = allBlocks(xml, "InputProxyChannel");
    const configured = getHikvisionConfigs().cameras.filter(
      (camera) => camera.nvrId === nvr.id && camera.enabled !== false,
    );

    const discovered = blocks.map((block, index) => {
      const channel = numberValue(tag(block, "id"));
      const override = getCameraConfig(nvr.id, channel);
      return {
        id: `${nvr.id}-${channel ?? index + 1}`,
        channel,
        name: override?.name || tag(block, "name") || `Channel ${channel ?? index + 1}`,
        ipAddress: override?.ipAddress !== undefined ? override.ipAddress ?? null : (tag(block, "ipAddress") ?? null),
        status: "UNKNOWN" as const,
        lastChecked: null,
        offlineSince: null,
        error: null,
      };
    });

    const discoveredChannels = new Set(
      discovered.map((camera) => camera.channel).filter((channel): channel is number => channel !== null),
    );

    const extraConfigured = configured
      .filter((camera) => !discoveredChannels.has(camera.channel))
      .map((camera) => ({
        id: `${nvr.id}-${camera.channel}`,
        channel: camera.channel,
        name: camera.name || `Channel ${camera.channel}`,
        ipAddress: camera.ipAddress ?? null,
        status: "UNKNOWN" as const,
        lastChecked: null,
        offlineSince: null,
        error: null,
      }));

    return [...discovered, ...extraConfigured];
  } catch (error) {
    const configured = getHikvisionConfigs().cameras.filter(
      (camera) => camera.nvrId === nvr.id && camera.enabled !== false,
    );
    if (configured.length > 0) {
      return configured.map((camera) => ({
        id: `${nvr.id}-${camera.channel}`,
        channel: camera.channel,
        name: camera.name || `Channel ${camera.channel}`,
        ipAddress: camera.ipAddress ?? null,
        status: "UNKNOWN" as const,
        lastChecked: new Date().toISOString(),
        offlineSince: null,
        error: error instanceof Error ? error.message : "Unable to read camera channels",
      }));
    }
    return [{
      id: `${nvr.id}-error`,
      channel: null,
      name: "Unable to read camera channels",
      ipAddress: null,
      status: "UNKNOWN",
      lastChecked: new Date().toISOString(),
      offlineSince: null,
      error: error instanceof Error ? error.message : "Unknown Hikvision error",
    }];
  }
}

async function getCameraStatus(nvr: NvrConfig, cameras: NvrCamera[]) {
  const now = new Date().toISOString();
  try {
    const xml = await hikvisionRequest(baseUrl(nvr), nvr.username, nvr.password, "/ISAPI/ContentMgmt/InputProxy/channels/status");
    const blocks = allBlocks(xml, "InputProxyChannelStatus");
    const updates = cameras.map((camera) => {
      const block = blocks.find((item) => numberValue(tag(item, "id")) === camera.channel);
      const statusValue = tag(block ?? "", "online") ?? tag(block ?? "", "status");
      const normalizedStatus = statusValue?.toLowerCase();
      const online = normalizedStatus === "true" || statusValue === "1" || normalizedStatus === "online";
      const nextStatus: NvrCamera["status"] = !block ? "UNKNOWN" : online ? "ONLINE" : "OFFLINE";
      return { nvrId: nvr.id, channel: camera.channel, status: nextStatus, now };
    });
    const persisted = updateCameraStates(updates);
    return cameras.map((camera, index) => ({ ...camera, status: updates[index].status, lastChecked: now, offlineSince: persisted[index]?.offlineSince ?? null }));
  } catch {
    const updates = cameras.map((camera) => ({ nvrId: nvr.id, channel: camera.channel, status: "UNKNOWN" as const, now }));
    const persisted = updateCameraStates(updates);
    return cameras.map((camera, index) => ({ ...camera, status: "UNKNOWN" as const, lastChecked: now, offlineSince: persisted[index]?.offlineSince ?? null }));
  }
}
async function getStorage(nvr: NvrConfig): Promise<NvrStorage[]> {
  try {
    const xml = await hikvisionRequest(
      baseUrl(nvr),
      nvr.username,
      nvr.password,
      "/ISAPI/ContentMgmt/Storage/hdd",
    );

    return allBlocks(xml, "hdd").map((block, index) => ({
      id: tag(block, "id") ?? String(index + 1),

      // Hikvision XML normally uses <hddName>
      name: tag(block, "hddName") ?? tag(block, "name") ?? `HDD ${index + 1}`,

      status: tag(block, "status") ?? "UNKNOWN",

      capacityGb: storageGb(tag(block, "capacity")),

      freeGb: storageGb(tag(block, "freeSpace")),
    }));
  } catch {
    return [];
  }
}

async function readNvr(config: NvrConfig): Promise<{
  nvr: Nvr;
  cameras: NvrCamera[];
}> {
  const checked = new Date().toISOString();

  try {
    const info = await getDeviceInfo(config);

    let cameras = await getCameras(config);

    cameras = await getCameraStatus(config, cameras);

    const storage = await getStorage(config);

    const realCameras = cameras.filter((camera) => camera.channel !== null);

    return {
      nvr: {
        id: config.id,

        routeId: encodeNvrRouteId(config.id),

        name: config.name,

        host: config.host,

        site: config.site ?? null,

        model: info.model,

        serialNumber: info.serialNumber,

        firmware: info.firmware,

        status: "ONLINE",

        lastChecked: checked,

        cameraCount: realCameras.length,

        onlineCameraCount: realCameras.filter(
          (camera) => camera.status === "ONLINE",
        ).length,

        offlineCameraCount: realCameras.filter(
          (camera) => camera.status === "OFFLINE",
        ).length,

        storage,

        error: null,
      },

      cameras,
    };
  } catch (error) {
    return {
      nvr: {
        id: config.id,

        routeId: encodeNvrRouteId(config.id),

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

        error:
          error instanceof Error ? error.message : "Unable to connect to NVR",
      },

      cameras: [],
    };
  }
}

export async function getNvrList(): Promise<Nvr[]> {
  const configs = configList();

  const results = await Promise.all(configs.map(readNvr));

  return results.map((result) => result.nvr);
}

export async function getNvrDetail(id: string) {
  const configs = configList();

  const decodedRouteId = decodeNvrRouteId(id).trim();

  const decodedIds = decodeRepeatedly(id).map((value) => value.trim());

  let config = configs.find((item) => encodeNvrRouteId(item.id) === id);

  if (!config) {
    config = configs.find(
      (item) =>
        item.id.trim() === decodedRouteId ||
        decodedIds.includes(item.id.trim()),
    );
  }

  if (!config) {
    const normalized = decodeRepeatedly(decodedRouteId).map((value) =>
      value.trim(),
    );

    config = configs.find((item) => normalized.includes(item.id.trim()));
  }

  if (!config) {
    return null;
  }

  return readNvr(config);
}

function decodeRepeatedly(value: string) {
  const values = [value];

  let current = value;

  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current);

      if (decoded === current) {
        break;
      }

      values.push(decoded);
      current = decoded;
    } catch {
      break;
    }
  }

  return Array.from(new Set(values));
}

export async function getAllCctv() {
  const configs = configList();

  const results = await Promise.all(configs.map(readNvr));

  return results.flatMap(({ nvr, cameras }) =>
    cameras
      .filter((camera) => camera.channel !== null)
      .map((camera) => ({
        ...camera,
        nvrId: nvr.id,
        nvrRouteId: nvr.routeId,
        nvrName: nvr.name,
        nvrHost: nvr.host,
        site: nvr.site,
      })),
  );
}
