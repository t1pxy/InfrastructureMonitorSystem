import { getAllCctv, getNvrList } from "@/lib/hikvision/query";

import {
  updateMonitorRunError,
  updateMonitorRunStart,
  updateMonitorRunSuccess,
} from "@/lib/hikvision/monitor-state";

export async function runHikvisionMonitor() {
  const started = await updateMonitorRunStart();

  try {
    /*
     * Query all NVRs.
     *
     * getAllCctv() already performs:
     *
     * NVR
     *   -> Device Info
     *   -> Camera Channels
     *   -> Camera Status
     *   -> Storage
     *
     * and the existing camera-state layer
     * preserves Offline Since.
     */
    const cameras = await getAllCctv();

    /*
     * Get NVR summary.
     */
    const nvrs = await getNvrList();

    const monitorCameras = cameras.map((camera) => ({
      key: `${camera.nvrId}::${camera.channel}`,

      nvrId: camera.nvrId,

      nvrName: camera.nvrName,

      nvrRouteId: camera.nvrRouteId,

      nvrHost: camera.nvrHost,

      site: camera.site,

      cameraId: camera.id,

      channel: camera.channel,

      cameraName: camera.name,

      ipAddress: camera.ipAddress,

      status: camera.status,

      lastChecked: camera.lastChecked,

      offlineSince: camera.offlineSince ?? null,

      error: camera.error ?? null,
    }));

    const state = await updateMonitorRunSuccess(monitorCameras, {
      total: nvrs.length,

      online: nvrs.filter((nvr) => nvr.status === "ONLINE").length,

      offline: nvrs.filter((nvr) => nvr.status === "OFFLINE").length,
    });

    return {
      success: true,
      state,
      startedAt: started.lastRunStartedAt,
      finishedAt: state.lastRunFinishedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hikvision monitor failed";

    const state = await updateMonitorRunError(message);

    return {
      success: false,
      state,
      error: message,
    };
  }
}
