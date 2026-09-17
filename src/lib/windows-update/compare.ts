import {
  GENERATED_ON,
  SOURCE_URL,
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

  currentVersion: string | null;

  currentBuild: string | null;

  latestBuild: string | null;

  latestKb: string | null;

  latestReleaseDate: string | null;

  revisionsBehind: number | null;

  endOfUpdates: string | null;

  sourceUrl: string;

  generatedOn: string;
};

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
  if (!value) {
    return null;
  }

  const match = value
    .trim()
    .match(/\b(\d{2}H[12])\b/i);

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
  if (!value) {
    return null;
  }

  const normalized = clean(value);

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

function inferVersionFromBuild(
  build: ParsedWindowsBuild | null,
): string | null {
  if (!build) {
    return null;
  }

  return (
    BUILD_VERSION_MAP[String(build.major)] ??
    null
  );
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
      info.featureVersion?.toUpperCase() ===
      target
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

  return (
    [...info.revisions].sort(
      (a, b) => b.ubr - a.ubr,
    )[0] ?? null
  );
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
  const currentBuild =
    parseBuild(windowsBuild);

  const explicitVersion =
    normalizeVersion(windowsVersion);

  const inferredVersion =
    inferVersionFromBuild(currentBuild);

  const currentVersion =
    explicitVersion ??
    inferredVersion;

  if (
    !currentBuild ||
    !currentVersion
  ) {
    return {
      status: "UNKNOWN",
      currentVersion,
      currentBuild:
        currentBuild?.value ??
        windowsBuild ??
        null,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfUpdates: null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const release =
    getBuildInfoByVersion(
      currentVersion,
    );

  if (!release) {
    return {
      status: "UNKNOWN",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfUpdates: null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const { info } = release;

  const latest =
    getLatestRevision(info);

  if (!latest) {
    return {
      status: info.ended
        ? "UNSUPPORTED_VERSION"
        : "UNKNOWN",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: null,
      latestKb: null,
      latestReleaseDate: null,
      revisionsBehind: null,
      endOfUpdates:
        info.endOfUpdates ??
        null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  if (info.ended) {
    return {
      status: "UNSUPPORTED_VERSION",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: latest.build,
      latestKb: latest.kb,
      latestReleaseDate:
        latest.date,
      revisionsBehind:
        currentBuild.hasUbr
          ? countRevisionsBehind(
              info,
              currentBuild.ubr,
              latest.ubr,
            )
          : null,
      endOfUpdates:
        info.endOfUpdates ??
        null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  if (!currentBuild.hasUbr) {
    return {
      status: "UNKNOWN",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: latest.build,
      latestKb: latest.kb,
      latestReleaseDate:
        latest.date,
      revisionsBehind: null,
      endOfUpdates:
        info.endOfUpdates ??
        null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  const releaseBuildNumber =
    Number(release.buildNumber);

  if (
    !Number.isFinite(
      releaseBuildNumber,
    ) ||
    releaseBuildNumber !==
      currentBuild.major
  ) {
    return {
      status: "UNKNOWN",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: latest.build,
      latestKb: latest.kb,
      latestReleaseDate:
        latest.date,
      revisionsBehind: null,
      endOfUpdates:
        info.endOfUpdates ??
        null,
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

  if (
    currentBuild.ubr >=
    latest.ubr
  ) {
    return {
      status: "CURRENT",
      currentVersion,
      currentBuild:
        currentBuild.value,
      latestBuild: latest.build,
      latestKb: latest.kb,
      latestReleaseDate:
        latest.date,
      revisionsBehind: 0,
      endOfUpdates:
        info.endOfUpdates ??
        null,
      sourceUrl: SOURCE_URL,
      generatedOn: GENERATED_ON,
    };
  }

  return {
    status: "UPDATE_AVAILABLE",
    currentVersion,
    currentBuild:
      currentBuild.value,
    latestBuild: latest.build,
    latestKb: latest.kb,
    latestReleaseDate:
      latest.date,
    revisionsBehind,
    endOfUpdates:
      info.endOfUpdates ??
      null,
    sourceUrl: SOURCE_URL,
    generatedOn: GENERATED_ON,
  };
}