"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HardwareSummary, {
  type HardwareCardFilter,
} from "@/components/hardware/HardwareSummary";

import HardwareTable from "@/components/hardware/HardwareTable";

import type {
  Hardware,
  HardwareDeviceType,
  HardwareListResponse,
  HardwareSummary as HardwareSummaryType,
  HardwareSummaryResponse,
} from "@/types/hardware";

const PAGE_SIZE = 20;

const EMPTY_SUMMARY: HardwareSummaryType = {
  total: 0,
  healthy: 0,
  warning: 0,
  critical: 0,
  offline: 0,
  unknown: 0,
  updatePending: 0,
  desktop: 0,
  notebook: 0,
};

export default function HardwarePage() {
  const [data, setData] = useState<Hardware[]>([]);

  const [summary, setSummary] = useState<HardwareSummaryType>(EMPTY_SUMMARY);

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [deviceType, setDeviceType] = useState<HardwareDeviceType>("ALL");

  const [cardFilter, setCardFilter] = useState<HardwareCardFilter>("ALL");

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [summaryLoading, setSummaryLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        const params = new URLSearchParams();

        params.set("type", deviceType);

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(`/api/hardware?${params.toString()}`, {
          cache: "no-store",
        });

        const json = (await response.json()) as HardwareListResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.error ?? "Failed to load hardware");
        }

        const rows = Array.isArray(json.data)
          ? json.data.map((item) => ({
              ...item,
              id: item.id || item.hostname || "",
              hostname: item.hostname || item.id || "Unknown",
            }))
          : [];

        setData(rows);

        setPage(1);
      } catch (cause) {
        console.error(cause);

        setError(
          cause instanceof Error ? cause.message : "Failed to load hardware",
        );

        if (!silent) {
          setData([]);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [deviceType, search],
  );

  const loadSummary = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setSummaryLoading(true);
        }

        const response = await fetch(
          `/api/hardware/summary?type=${deviceType}`,
          {
            cache: "no-store",
          },
        );

        const json = (await response.json()) as HardwareSummaryResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.error ?? "Failed to load summary");
        }

        setSummary(json.data ?? EMPTY_SUMMARY);
      } catch (cause) {
        console.error(cause);

        setSummary(EMPTY_SUMMARY);
      } finally {
        if (!silent) {
          setSummaryLoading(false);
        }
      }
    },
    [deviceType],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadData(true);
      void loadSummary(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [loadData, loadSummary]);

  const refreshAll = async () => {
    try {
      setRefreshing(true);

      await Promise.all([loadData(true), loadSummary(true)]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardFilter = (filter: HardwareCardFilter) => {
    setCardFilter(filter);
    setPage(1);

    /*
     * Total = reset all filters
     */
    if (filter === "ALL") {
      setDeviceType("ALL");
      return;
    }

    /*
     * Notebook = filter device type
     */
    if (filter === "NOTEBOOK") {
      setDeviceType("NOTEBOOK");
      return;
    }

    /*
     * Status cards keep the current
     * device type filter.
     */
  };

  const filteredData = useMemo(() => {
    switch (cardFilter) {
      case "HEALTHY":
        return data.filter((item) => item.status === "HEALTHY");

      case "WARNING":
        return data.filter((item) => item.status === "WARNING");

      case "CRITICAL":
        return data.filter((item) => item.status === "CRITICAL");

      case "OFFLINE":
        return data.filter((item) => item.status === "OFFLINE");

      case "UNKNOWN":
        return data.filter((item) => item.status === "UNKNOWN");

      case "UPDATE_PENDING":
        return data.filter(
          (item) =>
            item.windowsUpdate === "UPDATE_AVAILABLE" ||
            item.windowsUpdate === "UNSUPPORTED_VERSION",
        );

      case "NOTEBOOK":
        return data.filter((item) => item.deviceClass === "NOTEBOOK");

      case "ALL":
      default:
        return data;
    }
  }, [data, cardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const rangeStart =
    filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredData.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hardware Monitor
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Live CPU, RAM, Disk and device status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-xs text-muted-foreground sm:block">
            Auto refresh: 30s
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={refreshAll}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <HardwareSummary
        summary={summary}
        loading={summaryLoading}
        activeFilter={cardFilter}
        onFilterChange={handleCardFilter}
      />

      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Search</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={searchInput}
                onChange={(event) => {
                  const value = event.target.value;

                  setSearchInput(value);
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Machine / IP / User / Department / Location..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full xl:w-[220px]">
            <label className="mb-2 block text-sm font-medium">
              Device Type
            </label>

            <select
              value={deviceType}
              onChange={(event) => {
                const value = event.target.value as HardwareDeviceType;

                setDeviceType(value);
                setPage(1);

                /*
                 * When user manually changes
                 * device type, reset the card
                 * filter unless selecting notebook.
                 */
                if (value === "NOTEBOOK") {
                  setCardFilter("NOTEBOOK");
                } else {
                  setCardFilter("ALL");
                }
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All Devices</option>

              <option value="DESKTOP">Desktop</option>

              <option value="NOTEBOOK">Notebook</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Cannot load hardware</div>

          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <HardwareTable
        rows={visibleRows}
        page={currentPage}
        pageSize={PAGE_SIZE}
        loading={loading}
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{rangeStart}</span> -{" "}
          <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
          <span className="font-medium text-foreground">
            {filteredData.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="min-w-[90px] text-center text-sm">
            Page {currentPage} / {totalPages}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
