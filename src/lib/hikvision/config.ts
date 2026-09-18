import fs from "node:fs";
import path from "node:path";
import type { NvrConfig } from "@/types/nvr";

export interface CameraConfig {
  nvrId: string;
  channel: number;
  name?: string;
  ipAddress?: string | null;
  enabled?: boolean;
}

export interface HikvisionConfigStore {
  nvrs: NvrConfig[];
  cameras: CameraConfig[];
}

const CONFIG_FILE = path.join(process.cwd(), "data", "hikvision-config.json");
let memoryStore: HikvisionConfigStore | null = null;

function envConfigs(): NvrConfig[] {
  const raw = process.env.HIKVISION_NVR_CONFIG;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is NvrConfig =>
          !!item && typeof item === "object" &&
          typeof (item as NvrConfig).id === "string" &&
          typeof (item as NvrConfig).host === "string" &&
          typeof (item as NvrConfig).username === "string" &&
          typeof (item as NvrConfig).password === "string",
        )
      : [];
  } catch {
    throw new Error("HIKVISION_NVR_CONFIG is not valid JSON.");
  }
}

function save(store: HikvisionConfigStore) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(store, null, 2);
  let last: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      fs.writeFileSync(CONFIG_FILE, payload, { encoding: "utf8", flag: "w" });
      return;
    } catch (error) {
      last = error;
      if (attempt < 2) {
        const end = Date.now() + 50 * (attempt + 1);
        while (Date.now() < end) {}
      }
    }
  }
  console.error("[Hikvision Config] Failed to save:", last);
}

function load(): HikvisionConfigStore {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as Partial<HikvisionConfigStore>;
      if (Array.isArray(parsed.nvrs) && Array.isArray(parsed.cameras)) {
        memoryStore = { nvrs: parsed.nvrs, cameras: parsed.cameras };
        return memoryStore;
      }
    }
  } catch (error) {
    console.error("[Hikvision Config] Failed to load:", error);
  }
  memoryStore = { nvrs: envConfigs(), cameras: [] };
  return memoryStore;
}

export function getHikvisionConfigs() {
  return load();
}

export function getNvrConfig(id: string) {
  return load().nvrs.find((nvr) => nvr.id === id) ?? null;
}

export function getCameraConfig(nvrId: string, channel: number | null) {
  if (channel === null) return null;
  return load().cameras.find((camera) => camera.nvrId === nvrId && camera.channel === channel) ?? null;
}

export function upsertNvrConfig(config: NvrConfig) {
  const store = load();
  const index = store.nvrs.findIndex((nvr) => nvr.id === config.id);
  if (index >= 0) store.nvrs[index] = config;
  else store.nvrs.push(config);
  save(store);
  return config;
}

export function deleteNvrConfig(id: string) {
  const store = load();
  store.nvrs = store.nvrs.filter((nvr) => nvr.id !== id);
  store.cameras = store.cameras.filter((camera) => camera.nvrId !== id);
  save(store);
}

export function upsertCameraConfig(config: CameraConfig) {
  const store = load();
  const index = store.cameras.findIndex(
    (camera) => camera.nvrId === config.nvrId && camera.channel === config.channel,
  );
  if (index >= 0) store.cameras[index] = { ...store.cameras[index], ...config };
  else store.cameras.push(config);
  save(store);
  return getCameraConfig(config.nvrId, config.channel);
}
