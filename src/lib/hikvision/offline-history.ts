import fs from "node:fs";
import path from "node:path";

export type OfflineHistoryStatus = "ONGOING" | "RECOVERED";

export interface OfflineHistoryRecord {
  id: string;
  nvrId: string;
  nvrName?: string;
  channel: number | null;
  cameraId?: string;
  cameraName?: string;
  ipAddress?: string | null;
  site?: string | null;
  offlineSince: string;
  recoveredAt: string | null;
  durationSeconds: number | null;
  status: OfflineHistoryStatus;
}

const HISTORY_FILE = path.join(process.cwd(), "data", "hikvision-offline-history.json");
let memoryStore: OfflineHistoryRecord[] | null = null;

function load(): OfflineHistoryRecord[] {
  if (memoryStore) return memoryStore;
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      memoryStore = [];
      return memoryStore;
    }
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as unknown;
    memoryStore = Array.isArray(parsed) ? (parsed as OfflineHistoryRecord[]) : [];
  } catch (error) {
    console.error("[Hikvision Offline History] Failed to load:", error);
    memoryStore = [];
  }
  return memoryStore;
}

function save(records: OfflineHistoryRecord[]) {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify(records, null, 2);
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        fs.writeFileSync(HISTORY_FILE, payload, { encoding: "utf8", flag: "w" });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          const end = Date.now() + 50 * (attempt + 1);
          while (Date.now() < end) {}
        }
      }
    }
    throw lastError;
  } catch (error) {
    console.error("[Hikvision Offline History] Failed to save:", error);
  }
}

function historyId(nvrId: string, channel: number | null, offlineSince: string) {
  return Buffer.from(`${nvrId}::${channel ?? "unknown"}::${offlineSince}`).toString("base64url");
}

export interface OfflineHistoryTransition {
  nvrId: string;
  nvrName?: string;
  channel: number | null;
  cameraId?: string;
  cameraName?: string;
  ipAddress?: string | null;
  site?: string | null;
  fromStatus: "ONLINE" | "OFFLINE" | "UNKNOWN" | null;
  toStatus: "ONLINE" | "OFFLINE" | "UNKNOWN";
  offlineSince: string | null;
  now: string;
}

export function recordOfflineTransitions(transitions: OfflineHistoryTransition[]) {
  if (!transitions.length) return;
  const records = load();
  let changed = false;

  for (const item of transitions) {
    const key = (channel: number | null) => `${item.nvrId}::${channel ?? "unknown"}`;
    const ongoing = records.find(
      (record) =>
        record.status === "ONGOING" &&
        key(record.channel) === key(item.channel) &&
        record.nvrId === item.nvrId,
    );

    if (item.toStatus === "OFFLINE" && item.offlineSince) {
      if (!ongoing) {
        records.unshift({
          id: historyId(item.nvrId, item.channel, item.offlineSince),
          nvrId: item.nvrId,
          nvrName: item.nvrName,
          channel: item.channel,
          cameraId: item.cameraId,
          cameraName: item.cameraName,
          ipAddress: item.ipAddress ?? null,
          site: item.site ?? null,
          offlineSince: item.offlineSince,
          recoveredAt: null,
          durationSeconds: null,
          status: "ONGOING",
        });
        changed = true;
      }
    } else if (item.toStatus === "ONLINE" && ongoing) {
      const durationSeconds = Math.max(
        0,
        Math.floor((new Date(item.now).getTime() - new Date(ongoing.offlineSince).getTime()) / 1000),
      );
      ongoing.recoveredAt = item.now;
      ongoing.durationSeconds = durationSeconds;
      ongoing.status = "RECOVERED";
      changed = true;
    }
  }

  if (changed) save(records);
}

export function getOfflineHistory(options?: {
  nvrId?: string;
  status?: OfflineHistoryStatus | "ALL";
  limit?: number;
}) {
  let records = [...load()];
  if (options?.nvrId) records = records.filter((item) => item.nvrId === options.nvrId);
  if (options?.status && options.status !== "ALL") records = records.filter((item) => item.status === options.status);
  records.sort((a, b) => new Date(b.offlineSince).getTime() - new Date(a.offlineSince).getTime());
  return options?.limit ? records.slice(0, options.limit) : records;
}
