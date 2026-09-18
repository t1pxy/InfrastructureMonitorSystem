const BASE_URL = process.env.MONITOR_BASE_URL || "http://127.0.0.1:3000";

const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS || 60_000);

const SECRET = process.env.HIKVISION_MONITOR_SECRET || "";

let running = false;

async function run() {
  if (running) {
    console.log("[Hikvision Worker] Previous check is still running. Skip.");

    return;
  }

  running = true;

  const startedAt = new Date();

  console.log(`[Hikvision Worker] Check started: ${startedAt.toISOString()}`);

  try {
    const headers = {};

    if (SECRET) {
      headers["x-monitor-secret"] = SECRET;
    }

    const response = await fetch(`${BASE_URL}/api/monitor/run`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();

    let json;
    try {
      json = JSON.parse(body);
    } catch {
      const preview = body.replace(/\\s+/g, " ").slice(0, 300);
      console.error(
        "[Hikvision Worker] Endpoint did not return JSON:",
        response.status,
        contentType,
        preview,
      );
      console.error(
        "[Hikvision Worker] Check that Next.js is running and the API exists:",
        `${BASE_URL}/api/monitor/run`,
      );
      return;
    }

    if (!response.ok) {
      console.error("[Hikvision Worker] HTTP error:", response.status, json);
      return;
    }

    if (!json.success) {
      console.error("[Hikvision Worker] Monitor failed:", json.error);
      return;
    }

    const state = json.state;

    console.log(
      [
        "[Hikvision Worker] Check completed",
        `NVR: ${state.onlineNvr}/${state.totalNvr} online`,
        `CCTV: ${state.onlineCamera}/${state.totalCamera} online`,
        `Offline: ${state.offlineCamera}`,
        `Unknown: ${state.unknownCamera}`,
      ].join(" | "),
    );
  } catch (error) {
    console.error("[Hikvision Worker] Request failed:", error);
  } finally {
    running = false;
  }
}

console.log("[Hikvision Worker] Started");

console.log(`[Hikvision Worker] Base URL: ${BASE_URL}`);

console.log(`[Hikvision Worker] Interval: ${INTERVAL_MS} ms`);

/*
 * Run immediately.
 */
await run();

/*
 * Continue forever.
 */
setInterval(() => {
  void run();
}, INTERVAL_MS);
