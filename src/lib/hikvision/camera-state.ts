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
  const directory = path.dirname(STATE_FILE);
  const tempFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(store, null, 2);

  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {
        recursive: true,
      });
    }

    // Write to a temporary file first, then replace the state file.
    // This avoids partial JSON files and is safer when multiple monitor
    // requests/processes touch the state file on Windows.
    fs.writeFileSync(tempFile, payload, {
      encoding: "utf8",
      flag: "w",
    });

    fs.renameSync(tempFile, STATE_FILE);
  } catch (error) {
    console.error("[Hikvision Camera State] Failed to save state:", error);

    // Best-effort cleanup of the temporary file.
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors.
    }

    // If replacing the file failed because Windows temporarily held it,
    // retry the direct write once rather than losing the in-memory state.
    try {
      fs.writeFileSync(STATE_FILE, payload, "utf8");
    } catch (retryError) {
      console.error(
        "[Hikvision Camera State] Retry failed:",
        retryError,
      );
    }
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