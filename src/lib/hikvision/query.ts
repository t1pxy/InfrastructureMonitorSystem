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
  return getHikvisionConfigs().nvrs.filter(
    (item) => item.id && item.host && item.username,
  );
}
