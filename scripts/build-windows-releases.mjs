/**
 * Generate Windows release history from Microsoft's public Release Health page.
 *
 * Run:
 *   npm run windows:refresh
 *
 * This follows the same model used by starcat_dashboard: Windows release data is
 * generated at maintenance time and bundled with the application, so the
 * dashboard does not need Internet access on every page render.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(PROJECT_ROOT, "src/lib/windows-update/windows-releases.ts");
const SOURCE_URL =
  "https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information";

const KEEP_BUILDS = new Set(["22631", "26100", "26200", "28000"]);

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(html) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
      decodeHtml(cell[1]),
    ),
  );
}

function parseDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseBuild(value) {
  const match = value.match(/^(\d{5})\.(\d+)$/);
  if (!match) return null;
  return { major: match[1], ubr: Number(match[2]), value };
}

function findKb(cells) {
  const cell = cells.find((value) => /\bKB\d{6,8}\b/i.test(value));
  const match = cell?.match(/\bKB\d{6,8}\b/i);
  return match ? match[0].toUpperCase() : null;
}

const versionByBuild = {
  "22631": "23H2",
  "26100": "24H2",
  "26200": "25H2",
  "28000": "26H1",
};

const endOfUpdatesByVersion = {
  // Home / Pro baseline from Microsoft's current-version table.
  "23H2": null,
  "24H2": "2026-10-13",
  "25H2": "2027-10-12",
  "26H1": "2028-03-14",
};

async function fetchPage() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "InfrastructureMonitorSystem/windows-release-builder",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Microsoft release page returned HTTP ${response.status}`);
  }

  return response.text();
}

function parseRevisions(html) {
  const rows = parseRows(html);
  const byBuild = new Map();

  for (const cells of rows) {
    const buildIndex = cells.findIndex((cell) => /^\d{5}\.\d+$/.test(cell));
    if (buildIndex < 0) continue;

    const build = parseBuild(cells[buildIndex]);
    if (!build || !KEEP_BUILDS.has(build.major)) continue;

    const date = cells
      .slice(0, buildIndex)
      .map(parseDate)
      .filter(Boolean)
      .at(-1);

    if (!date) continue;

    const kb = findKb(cells);
    const version = versionByBuild[build.major];

    const list = byBuild.get(build.major) ?? [];
    const duplicate = list.some((item) => item.build === build.value);
    if (!duplicate) {
      list.push({
        build: build.value,
        ubr: build.ubr,
        date,
        kb,
      });
    }
    byBuild.set(build.major, list);

    if (!version) continue;
  }

  return byBuild;
}

function buildOutput(revisionsByBuild) {
  const generatedOn = new Date().toISOString().slice(0, 10);
  const entries = [];

  for (const major of Object.keys(versionByBuild).sort((a, b) => Number(b) - Number(a))) {
    const version = versionByBuild[major];
    const revisions = [...(revisionsByBuild.get(major) ?? [])].sort(
      (a, b) => b.ubr - a.ubr,
    );

    if (revisions.length === 0) continue;

    const rows = revisions
      .map(
        (item) =>
          `      { build: "${item.build}", ubr: ${item.ubr}, date: "${item.date}", kb: ${item.kb ? `"${item.kb}"` : "null"} },`,
      )
      .join("\n");

    entries.push(`  "${major}": {\n` +
      `    product: "Windows 11",\n` +
      `    featureVersion: "${version}",\n` +
      `    endOfUpdates: ${endOfUpdatesByVersion[version] ? `"${endOfUpdatesByVersion[version]}"` : "null"},\n` +
      `    ended: ${version === "23H2"},\n` +
      `    revisions: [\n${rows}\n    ],\n` +
      `  },`);
  }

  return `// GENERATED FILE — do not edit by hand.\n// Generated from: ${SOURCE_URL}\n// Refresh with: npm run windows:refresh\n\nexport type WindowsRevision = {\n  build: string;\n  ubr: number;\n  date: string;\n  kb: string | null;\n};\n\nexport type WindowsBuild = {\n  product: string;\n  featureVersion: string;\n  endOfUpdates: string | null;\n  ended: boolean;\n  revisions: WindowsRevision[];\n};\n\nexport const SOURCE_URL = ${JSON.stringify(SOURCE_URL)};\nexport const GENERATED_ON = ${JSON.stringify(generatedOn)};\n\nexport const WINDOWS_BUILDS: Record<string, WindowsBuild> = {\n${entries.join("\n")}\n};\n`;
}

const html = await fetchPage();
const revisions = parseRevisions(html);

if ([...revisions.values()].every((items) => items.length === 0)) {
  throw new Error(
    "No Windows release rows were parsed. Microsoft may have changed the page structure.",
  );
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, buildOutput(revisions), "utf8");

const summary = [...revisions.entries()]
  .map(([major, list]) => `${major}: ${list.length} revisions`)
  .join(", ");

console.log(`Generated ${OUTPUT}`);
console.log(summary);
