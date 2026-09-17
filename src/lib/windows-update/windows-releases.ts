// GENERATED FILE — baseline snapshot included with Phase 3.1.
// Refresh with: npm run windows:refresh

export type WindowsRevision = {
  build: string;
  ubr: number;
  date: string;
  kb: string | null;
};

export type WindowsBuild = {
  product: string;
  featureVersion: string;
  endOfUpdates: string | null;
  ended: boolean;
  revisions: WindowsRevision[];
};

export const SOURCE_URL =
  "https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information";

export const GENERATED_ON = "2026-09-08";

export const WINDOWS_BUILDS: Record<string, WindowsBuild> = {
  "28000": {
    product: "Windows 11",
    featureVersion: "26H1",
    endOfUpdates: "2028-03-14",
    ended: false,
    revisions: [
      { build: "28000.2954", ubr: 2954, date: "2026-09-08", kb: "KB5124012" },
      { build: "28000.2804", ubr: 2804, date: "2026-08-27", kb: "KB5120996" },
      { build: "28000.2704", ubr: 2704, date: "2026-08-11", kb: "KB5121000" },
      { build: "28000.2608", ubr: 2608, date: "2026-07-28", kb: "KB5101681" },
      { build: "28000.2525", ubr: 2525, date: "2026-07-14", kb: "KB5101649" },
    ],
  },
  "26200": {
    product: "Windows 11",
    featureVersion: "25H2",
    endOfUpdates: "2027-10-12",
    ended: false,
    revisions: [
      { build: "26200.9445", ubr: 9445, date: "2026-09-08", kb: "KB5124008" },
      { build: "26200.9278", ubr: 9278, date: "2026-08-27", kb: "KB5120998" },
      { build: "26200.9168", ubr: 9168, date: "2026-08-11", kb: "KB5121003" },
      { build: "26200.8973", ubr: 8973, date: "2026-07-28", kb: "KB5101684" },
      { build: "26200.8894", ubr: 8894, date: "2026-07-18", kb: "KB5121767" },
      { build: "26200.8875", ubr: 8875, date: "2026-07-14", kb: "KB5101650" },
      { build: "26200.8737", ubr: 8737, date: "2026-06-23", kb: "KB5095093" },
      { build: "26200.8655", ubr: 8655, date: "2026-06-09", kb: "KB5094126" },
      { build: "26200.8524", ubr: 8524, date: "2026-05-26", kb: "KB5089573" },
      { build: "26200.8457", ubr: 8457, date: "2026-05-12", kb: "KB5089549" },
      { build: "26200.8328", ubr: 8328, date: "2026-04-30", kb: "KB5083631" },
      { build: "26200.8246", ubr: 8246, date: "2026-04-14", kb: "KB5083769" },
      { build: "26200.8117", ubr: 8117, date: "2026-03-31", kb: "KB5086672" },
      { build: "26200.8037", ubr: 8037, date: "2026-03-10", kb: "KB5079473" },
      { build: "26200.7922", ubr: 7922, date: "2026-02-24", kb: "KB5077241" },
    ],
  },
  "26100": {
    product: "Windows 11",
    featureVersion: "24H2",
    endOfUpdates: "2026-10-13",
    ended: false,
    revisions: [
      { build: "26100.9445", ubr: 9445, date: "2026-09-08", kb: "KB5124008" },
      { build: "26100.9278", ubr: 9278, date: "2026-08-27", kb: "KB5120998" },
      { build: "26100.9168", ubr: 9168, date: "2026-08-11", kb: "KB5121003" },
      { build: "26100.8973", ubr: 8973, date: "2026-07-28", kb: "KB5101684" },
      { build: "26100.8894", ubr: 8894, date: "2026-07-18", kb: "KB5121767" },
      { build: "26100.8875", ubr: 8875, date: "2026-07-14", kb: "KB5101650" },
      { build: "26100.8737", ubr: 8737, date: "2026-06-23", kb: "KB5095093" },
      { build: "26100.8655", ubr: 8655, date: "2026-06-09", kb: "KB5094126" },
      { build: "26100.8524", ubr: 8524, date: "2026-05-26", kb: "KB5089573" },
      { build: "26100.8457", ubr: 8457, date: "2026-05-12", kb: "KB5089549" },
      { build: "26100.8328", ubr: 8328, date: "2026-04-30", kb: "KB5083631" },
      { build: "26100.8246", ubr: 8246, date: "2026-04-14", kb: "KB5083769" },
      { build: "26100.8117", ubr: 8117, date: "2026-03-31", kb: "KB5086672" },
      { build: "26100.8037", ubr: 8037, date: "2026-03-10", kb: "KB5079473" },
    ],
  },
  "22631": {
    product: "Windows 11",
    featureVersion: "23H2",
    endOfUpdates: null,
    ended: true,
    revisions: [
      { build: "22631.7582", ubr: 7582, date: "2026-09-08", kb: "KB5122880" },
      { build: "22631.7517", ubr: 7517, date: "2026-08-11", kb: "KB5120240" },
      { build: "22631.7376", ubr: 7376, date: "2026-07-14", kb: "KB5099414" },
      { build: "22631.7219", ubr: 7219, date: "2026-06-09", kb: "KB5093998" },
      { build: "22631.7079", ubr: 7079, date: "2026-05-12", kb: "KB5087420" },
      { build: "22631.6936", ubr: 6936, date: "2026-04-14", kb: "KB5082052" },
      { build: "22631.6783", ubr: 6783, date: "2026-03-10", kb: "KB5078883" },
    ],
  },
};
