"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LatestRelease {
  build: string;
  ubr: number;
  date: string;
  kb: string | null;
}

interface ReleaseResponse {
  source: string;
  generatedOn: string;
  latestByVersion: Record<string, LatestRelease | null>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function WindowsReleaseBaselineCard() {
  const [data, setData] = useState<ReleaseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const response = await fetch("/api/update/release", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as ReleaseResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Intentional fetch-on-mount; setLoading(true) inside load() must run
    // synchronously so the skeleton shows immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const entries = Object.entries(data?.latestByVersion ?? {})
    .filter(([, release]) => release)
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Microsoft Windows Baseline</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Release baseline bundled from Microsoft Release Health
          </p>
        </div>

        <Badge variant={data ? "default" : "secondary"}>
          {loading ? "LOADING" : data ? "READY" : "NO DATA"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {entries.map(([version, release]) => (
            <div key={version} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{version}</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums">
                {release?.build}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {release?.kb ?? "Base release"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {release?.date ? formatDate(release.date) : "-"}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Generated: {data?.generatedOn ?? "-"}
          </span>
          <Link href="https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              Microsoft Release Health
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
