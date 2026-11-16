import type { StatusKey } from "@/types";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/utils/cn";

interface StatusPillProps {
  status: StatusKey;
  compact?: boolean;
  className?: string;
}

export function StatusPill({ status, compact = false, className }: StatusPillProps) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold tracking-[0.045em]",
        meta.bg,
        meta.text,
        meta.border,
        compact ? "px-2 py-[3px] text-[9px] sm:text-[10px]" : "px-2.5 py-1 text-[10px] sm:text-[11px]",
        className
      )}
      title={meta.shortLabel}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
