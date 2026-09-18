import fs from "node:fs";
import path from "node:path";
import type { CameraStatus } from "@/types/nvr";

interface CameraState {
  status: CameraStatus;
  offlineSince: string | null;
  lastChecked: string | null;
}

type CameraStateStore = Record<string, CameraState>;

const STATE_FILE = path.join(
  process.cwd(),
  "data",
  "hikvision-camera-state.json",
);

let memoryStore: CameraStateStore | null = null;

function ensureStoreLoaded(): CameraStateStore {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (!fs.existsSync(STATE_FILE)) {
      memoryStore = {};
      return memoryStore;
    }

    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      memoryStore = parsed as CameraStateStore;
    } else {
      memoryStore = {};
    }
  } catch (error) {
    console.error("[Hikvision Camera State] Failed to load state:", error);
    memoryStore = {};
  }

  return memoryStore;
}

function saveStore(store: CameraStateStore) {
  try {
    const directory = path.dirname(STATE_FILE);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {
        recursive: true,
      });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (error) {
    console.error("[Hikvision Camera State] Failed to save state:", error);
  }
}

export function getCameraStateKey(nvrId: string, channel: number | null) {
  return `${nvrId}::${channel ?? "unknown"}`;
}

export function updateCameraState(
  nvrId: string,
  channel: number | null,
  status: CameraStatus,
  now: string,
) {
  const store = ensureStoreLoaded();
  const key = getCameraStateKey(nvrId, channel);
  const previous = store[key];

  let offlineSince: string | null = null;

  if (status === "OFFLINE") {
    if (previous?.status === "OFFLINE" && previous.offlineSince) {
      offlineSince = previous.offlineSince;
    } else {
      offlineSince = now;
    }
  } else if (status === "UNKNOWN") {
    // Do not destroy an existing offline timestamp when
    // Hikvision temporarily fails to return a status.
    offlineSince = previous?.offlineSince ?? null;
  }

  const next: CameraState = {
    status,
    offlineSince,
    lastChecked: now,
  };

  store[key] = next;
  saveStore(store);

  return next;
}

export function getCameraState(nvrId: string, channel: number | null) {
  const store = ensureStoreLoaded();
  return store[getCameraStateKey(nvrId, channel)] ?? null;
}