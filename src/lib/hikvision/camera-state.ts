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
  const payload = JSON.stringify(store, null, 2);

  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {
        recursive: true,
      });
    }

    // Windows can keep the existing JSON file open (for example by the
    // Next.js watcher/AV scanner), which makes rename-over-existing fail
    // with EPERM. Write directly with a short retry instead.
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        fs.writeFileSync(STATE_FILE, payload, {
          encoding: "utf8",
          flag: "w",
        });

        return;
      } catch (error) {
        lastError = error;

        if (attempt < 2) {
          const delayMs = 50 * (attempt + 1);
          const end = Date.now() + delayMs;

          while (Date.now() < end) {
            // Small synchronous backoff for transient Windows file locks.
          }
        }
      }
    }

    throw lastError;
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