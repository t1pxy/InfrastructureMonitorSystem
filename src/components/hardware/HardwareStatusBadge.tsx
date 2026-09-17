import type {
  HardwareStatus,
} from "@/types/hardware";

interface HardwareStatusBadgeProps {
  status: HardwareStatus;
}

const CONFIG: Record<
  HardwareStatus,
  {
    label: string;
    className: string;
  }
> = {
  HEALTHY: {
    label: "Healthy",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  },

  WARNING: {
    label: "Warning",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  },

  CRITICAL: {
    label: "Critical",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  },

  OFFLINE: {
    label: "Offline",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  },

  UNKNOWN: {
    label: "Unknown",
    className:
      "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400",
  },
};

export default function HardwareStatusBadge({
  status,
}: HardwareStatusBadgeProps) {
  const config =
    CONFIG[status] ??
    CONFIG.UNKNOWN;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}