import type { UpdateInventoryState } from "@/types/windows-update";

interface Props {
  status: UpdateInventoryState;
}

const CONFIG: Record<
  UpdateInventoryState,
  {
    label: string;
    className: string;
  }
> = {
  RECORDED: {
    label: "Recorded",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  },

  UNKNOWN: {
    label: "No Data",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  },

  OTHER_STATE: {
    label: "Other State",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  },
};

export default function UpdateStatusBadge({ status }: Props) {
  const config = CONFIG[status] ?? CONFIG.UNKNOWN;

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1",
        "text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}
