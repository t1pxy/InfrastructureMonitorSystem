import {
  GENERATED_ON,
  WINDOWS_BUILDS,
  type WindowsBuild,
  type WindowsRevision,
} from "@/lib/windows-update/windows-releases";

export type WindowsComplianceStatus =
  | "CURRENT"
  | "UPDATE_AVAILABLE"
  | "UNSUPPORTED_VERSION"
  | "UNKNOWN";

export type WindowsComplianceResult = {
  status: WindowsComplianceStatus;

  version: string | null;

  currentBuild: string | null;

  latestBuild: string | null;

  latestKb: string | null;

  latestReleaseDate: string | null;

  revisionsBehind: number | null;

  endOfServicing: string | null;

  sourceUrl: string;

  generatedOn: string;
};

const SOURCE_URL =
  "https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information";

const BUILD_VERSION_MAP: Record<string, string> = {
  "28000": "26H1",
  "26200": "25H2",
  "26100": "24H2",
  "22631": "23H2",
  "22621": "22H2",
};

function clean(value: string): string {
  return value
    .trim()
    .replace(/^OS Build\s*/i, "")
    .replace(/^Build\s*/i, "")
    .replace(/^Version\s*/i, "")
    .trim();
}

export function normalizeVersion(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const normalized = value.trim();

  const match = normalized.match(
    /\b(\d{2}H[12])\b/i,
  );

  if (!match) {
    return null;
  }

  return match[1].toUpperCase();
}

export type ParsedWindowsBuild = {
  major: number;
  ubr: number;
  value: string;
  hasUbr: boolean;
};

export function parseBuild(
  value: string | null | undefined,
): ParsedWindowsBuild | null {
  if (!value) return null;

  const normalized = clean(value);

  /*
   * 10.0.26200.9445
   */
  let match = normalized.match(
    /10\.0\.(\d{5})\.(\d{1,6})/,
  );

  if (match) {
    return {
      major: Number(match[1]),
      ubr: Number(match[2]),
      value: `${match[1]}.${match[2]}`,
      hasUbr: true,
    };
  }

  /*
   * 26200.9445
   */
  match = normalized.match(
    /\b(\d{5})\.(\d{1,6})\b/,
  );

  if (match) {
    return {
      major: Number(match[1]),
      ubr: Number(match[2]),
      value: `${match[1]}.${match[2]}`,
      hasUbr: true,
    };
  }

  /*
   * 10.0.26200
   */
  match = normalized.match(
    /10\.0\.(\d{5})\b/,
  );

  if (match) {
    return {
      major: Number(match[1]),
      ubr: 0,
      value: match[1],
      hasUbr: false,
    };
  }

  /*
   * 26200
   */
  match = normalized.match(
    /\b(\d{5})\b/,
  );

  if (match) {
    return {
      major: Number(match[1]),
      ubr: 0,
      value: match[1],
      hasUbr: false,
    };
  }

  return null;
}

export function inferVersionFromBuild(
  build: ParsedWindowsBuild | null,
): string | null {
  if (!build) {
    return null;
  }

  return BUILD_VERSION_MAP[String(build.major)] ?? null;
}

function getBuildInfoByVersion(
  version: string,
): {
  buildNumber: string;
  info: WindowsBuild;
} | null {
  const target = version.toUpperCase();

  for (const [buildNumber, info] of Object.entries(
    WINDOWS_BUILDS,
  )) {
    if (
      info.featureVersion?.toUpperCase() === target
    ) {
      return {
        buildNumber,
        info,
      };
    }
  }

  return null;
}

function getLatestRevision(
  info: WindowsBuild,
): WindowsRevision | null {
  if (!info.revisions?.length) {
    return null;
  }

  return [...info.revisions].sort(
    (a, b) => b.ubr - a.ubr,
  )[0] ?? null;
}

function countRevisionsBehind(
  info: WindowsBuild,
  currentUbr: number,
  latestUbr: number,
): number {
  if (currentUbr >= latestUbr) {
    return 0;
  }

  return info.revisions.filter(
    (revision) => revision.ubr > currentUbr,
  ).length;
}

export function compareWindowsBuild(
  windowsVersion: string | null | undefined,
  windowsBuild: string | null | undefined,
): WindowsComplianceResult {
  const currentBuild = parseBuild(
    windowsBuild,
  );

  const explicitVersion = normalizeVersion(
    windowsVersion,
  );

  const inferredVersion =
    inferVersionFromBuild(currentBuild);

  const currentVersion =
    explicitVersion ?? inferredVersion;

  /*
   * ไม่มี Build หรือ Version
   */
  if (!currentBuild || !currentVersion) {
    return {
      status: "UNKNOWN",
      version: currentVersion,
      currentBuild:
        currentBuild?.value ??
        windowsBuild ??
        null,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfServicing: null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  /*
   * หา release history ของ version นี้
   */
  const release = getBuildInfoByVersion(
    currentVersion,
  );

  if (!release) {
    return {
      status: "UNKNOWN",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfServicing: null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const { info } = release;

  /*
   * Version นี้หมด support แล้ว
   */
  if (info.ended) {
    const latest = getLatestRevision(info);

    return {
      status: "UNSUPPORTED_VERSION",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild: latest
        ? `${release.buildNumber}.${latest.ubr}`
        : null,
      latestKb: latest?.kb ?? null,
      latestReleaseDate: latest?.date ?? null,
      revisionsBehind:
        latest && currentBuild.hasUbr
          ? countRevisionsBehind(
              info,
              currentBuild.ubr,
              latest.ubr,
            )
          : null,
      endOfServicing:
        info.endOfServicing ?? null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const latest = getLatestRevision(info);

  /*
   * มี version แต่ไม่มี revision history
   */
  if (!latest) {
    return {
      status: "UNKNOWN",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfServicing:
        info.endOfServicing ?? null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  /*
   * ถ้า MSSQL มีแค่ Build แต่ไม่มี UBR
   * เราไม่ควรเดาว่าเครื่องล่าสุดหรือเก่า
   */
  if (!currentBuild.hasUbr) {
    return {
      status: "UNKNOWN",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild:
        `${release.buildNumber}.${latest.ubr}`,
      latestKb: latest.kb,
      latestReleaseDate: latest.date,
      revisionsBehind: null,
      endOfServicing:
        info.endOfServicing ?? null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const latestBuildValue =
    Number(release.buildNumber);

  /*
   * Major build mismatch
   *
   * เช่น current = 26100
   * แต่ version บอกว่า 25H2
   *
   * ไม่เดา -> UNKNOWN
   */
  if (
    !Number.isFinite(latestBuildValue) ||
    latestBuildValue !== currentBuild.major
  ) {
    return {
      status: "UNKNOWN",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild:
        `${release.buildNumber}.${latest.ubr}`,
      latestKb: latest.kb,
      latestReleaseDate: latest.date,
      revisionsBehind: null,
      endOfServicing:
        info.endOfServicing ?? null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const revisionsBehind =
    countRevisionsBehind(
      info,
      currentBuild.ubr,
      latest.ubr,
    );

  /*
   * Current >= latest
   */
  if (currentBuild.ubr >= latest.ubr) {
    return {
      status: "CURRENT",
      version: currentVersion,
      currentBuild: currentBuild.value,
      latestBuild:
        `${release.buildNumber}.${latest.ubr}`,
      latestKb: latest.kb,
      latestReleaseDate: latest.date,
      revisionsBehind: 0,
      endOfServicing:
        info.endOfServicing ?? null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  /*
   * Current < latest
   */
  return {
    status: "UPDATE_AVAILABLE",
    version: currentVersion,
    currentBuild: currentBuild.value,
    latestBuild:
      `${release.buildNumber}.${latest.ubr}`,
    latestKb: latest.kb,
    latestReleaseDate: latest.date,
    revisionsBehind,
    endOfServicing:
      info.endOfServicing ?? null,
    sourceUrl: SOURCE_URL,
    generatedOn: GENERATED_ON,
  };
}