import fs from "node:fs";
import path from "node:path";
import type { CameraStatus } from "@/types/nvr";

interface CameraState {
  status: CameraStatus;
  offlineSince: string | null;
  lastChecked: string | null;
}

type CameraStateStore = Record<string, CameraState>;

export interface CameraStateUpdate {
  nvrId: string;
  channel: number | null;
  status: CameraStatus;
  now: string;
}

const STATE_FILE = path.join(
  process.cwd(),
  "data",
  "hikvision-camera-state.json",
);

let memoryStore: CameraStateStore | null = null;

function ensureStoreLoaded(): CameraStateStore {
  if (memoryStore) return memoryStore;

  try {
    if (!fs.existsSync(STATE_FILE)) {
      memoryStore = {};
      return memoryStore;
    }

    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    memoryStore =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as CameraStateStore)
        : {};
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
      fs.mkdirSync(directory, { recursive: true });
    }

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
            // Short synchronous backoff for transient Windows file locks.
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

function buildNextState(
  store: CameraStateStore,
  update: CameraStateUpdate,
): CameraState {
  const key = getCameraStateKey(update.nvrId, update.channel);
  const previous = store[key];

  let offlineSince: string | null = null;

  if (update.status === "OFFLINE") {
    offlineSince =
      previous?.status === "OFFLINE" && previous.offlineSince
        ? previous.offlineSince
        : update.now;
  } else if (update.status === "UNKNOWN") {
    offlineSince = previous?.offlineSince ?? null;
  }

  return {
    status: update.status,
    offlineSince,
    lastChecked: update.now,
  };
}

/**
 * Updates all supplied camera states and writes the JSON file once.
 */
export function updateCameraStates(updates: CameraStateUpdate[]) {
  const store = ensureStoreLoaded();
  const states: CameraState[] = [];

  for (const update of updates) {
    const key = getCameraStateKey(update.nvrId, update.channel);
    const next = buildNextState(store, update);

    store[key] = next;
    states.push(next);
  }

  if (updates.length > 0) {
    saveStore(store);
  }

  return states;
}

/**
 * Backward-compatible single-camera helper.
 * Prefer updateCameraStates() for monitor batches.
 */
export function updateCameraState(
  nvrId: string,
  channel: number | null,
  status: CameraStatus,
  now: string,
) {
  return updateCameraStates([{ nvrId, channel, status, now }])[0];
}

export function getCameraState(nvrId: string, channel: number | null) {
  const store = ensureStoreLoaded();
  return store[getCameraStateKey(nvrId, channel)] ?? null;
}
