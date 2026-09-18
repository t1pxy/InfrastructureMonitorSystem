import fs from "node:fs/promises";
import path from "node:path";

export type MonitorCameraStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

export type MonitorCameraState = {
  key: string;

  nvrId: string;
  nvrName: string;
  nvrRouteId: string;
  nvrHost: string;
  site: string | null;

  cameraId: string;
  channel: number | null;
  cameraName: string;
  ipAddress: string | null;

  status: MonitorCameraStatus;

  lastChecked: string | null;
  offlineSince: string | null;

  error: string | null;
};

export type MonitorState = {
  version: 1;

  startedAt: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;

  lastRunStatus: "RUNNING" | "SUCCESS" | "ERROR" | "NEVER";

  lastRunError: string | null;

  totalNvr: number;
  onlineNvr: number;
  offlineNvr: number;

  totalCamera: number;
  onlineCamera: number;
  offlineCamera: number;
  unknownCamera: number;

  cameras: Record<string, MonitorCameraState>;
};

const DATA_DIR = path.join(process.cwd(), "data");

const STATE_FILE = path.join(DATA_DIR, "hikvision-monitor-state.json");

const EMPTY_STATE: MonitorState = {
  version: 1,

  startedAt: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,

  lastRunStatus: "NEVER",

  lastRunError: null,

  totalNvr: 0,
  onlineNvr: 0,
  offlineNvr: 0,

  totalCamera: 0,
  onlineCamera: 0,
  offlineCamera: 0,
  unknownCamera: 0,

  cameras: {},
};

let writeQueue = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });
}

export async function readMonitorState(): Promise<MonitorState> {
  try {
    const content = await fs.readFile(STATE_FILE, "utf8");

    const parsed = JSON.parse(content) as Partial<MonitorState>;

    return {
      ...EMPTY_STATE,
      ...parsed,
      cameras: parsed.cameras ?? {},
    };
  } catch {
    return {
      ...EMPTY_STATE,
      cameras: {},
    };
  }
}

export async function writeMonitorState(state: MonitorState) {
  await ensureDir();

  const content = JSON.stringify(state, null, 2);

  writeQueue = writeQueue.then(async () => {
    const tempFile = `${STATE_FILE}.tmp`;

    await fs.writeFile(tempFile, content, "utf8");

    await fs.rename(tempFile, STATE_FILE);
  });

  await writeQueue;
}

export async function updateMonitorRunStart() {
  const state = await readMonitorState();

  const now = new Date().toISOString();

  state.startedAt = state.startedAt ?? now;

  state.lastRunStartedAt = now;

  state.lastRunStatus = "RUNNING";

  state.lastRunError = null;

  await writeMonitorState(state);

  return state;
}

export async function updateMonitorRunSuccess(
  cameras: MonitorCameraState[],
  nvrStats: {
    total: number;
    online: number;
    offline: number;
  },
) {
  const state = await readMonitorState();

  const now = new Date().toISOString();

  const cameraMap: Record<string, MonitorCameraState> = {};

  for (const camera of cameras) {
    const previous = state.cameras[camera.key];

    let offlineSince = camera.offlineSince;

    /*
     * Preserve the original offline time.
     */
    if (camera.status === "OFFLINE") {
      offlineSince =
        previous?.status === "OFFLINE" && previous.offlineSince
          ? previous.offlineSince
          : (camera.offlineSince ?? now);
    }

    /*
     * If the camera becomes online,
     * clear Offline Since.
     */
    if (camera.status === "ONLINE") {
      offlineSince = null;
    }

    /*
     * UNKNOWN does not destroy
     * the existing offline timestamp.
     */
    if (camera.status === "UNKNOWN" && previous?.offlineSince) {
      offlineSince = previous.offlineSince;
    }

    cameraMap[camera.key] = {
      ...camera,
      offlineSince,
      lastChecked: camera.lastChecked ?? now,
    };
  }

  state.lastRunFinishedAt = now;

  state.lastRunStatus = "SUCCESS";

  state.lastRunError = null;

  state.totalNvr = nvrStats.total;

  state.onlineNvr = nvrStats.online;

  state.offlineNvr = nvrStats.offline;

  state.totalCamera = cameras.length;

  state.onlineCamera = cameras.filter(
    (camera) => camera.status === "ONLINE",
  ).length;

  state.offlineCamera = cameras.filter(
    (camera) => camera.status === "OFFLINE",
  ).length;

  state.unknownCamera = cameras.filter(
    (camera) => camera.status === "UNKNOWN",
  ).length;

  state.cameras = cameraMap;

  await writeMonitorState(state);

  return state;
}

export async function updateMonitorRunError(error: string) {
  const state = await readMonitorState();

  state.lastRunFinishedAt = new Date().toISOString();

  state.lastRunStatus = "ERROR";

  state.lastRunError = error;

  await writeMonitorState(state);

  return state;
}
