import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type KpiAccent = "brand" | "execution" | "strategy" | "paused";

interface KPICardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  accent?: KpiAccent;
}

const ACCENTS: Record<
  KpiAccent,
  { icon: string; dot: string; wash: string; edge: string }
> = {
  brand: {
    icon: "bg-brand-100 text-brand-700 ring-brand-700/10",
    dot: "bg-brand-500",
    wash: "bg-brand-500/[0.055]",
    edge: "from-brand-700 to-brand-500",
  },
  execution: {
    icon: "bg-status-ok/10 text-status-ok ring-status-ok/10",
    dot: "bg-status-ok",
    wash: "bg-status-ok/[0.05]",
    edge: "from-status-ok to-brand-500",
  },
  strategy: {
    icon: "bg-status-done/10 text-status-done ring-status-done/10",
    dot: "bg-status-done",
    wash: "bg-status-done/[0.05]",
    edge: "from-status-done to-brand-500",
  },
  paused: {
    icon: "bg-status-paused/10 text-status-paused ring-status-paused/10",
    dot: "bg-status-paused",
    wash: "bg-status-paused/[0.05]",
    edge: "from-status-paused to-status-muted",
  },
};

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
}: KPICardProps) {
  const styles = ACCENTS[accent];

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-lg border border-white/60 bg-white/80 p-5 shadow-md backdrop-blur-md transition-shadow duration-200 hover:shadow-lg">
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl",
          styles.wash
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100",
          styles.edge
        )}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-text2">
            {label}
          </p>
          <p className="mt-2.5 font-display text-[36px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-text sm:text-[40px]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1",
            styles.icon
          )}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={1.9} />
        </span>
      </div>
      {hint ? (
        <div className="relative mt-4 flex items-center gap-1.5 border-t border-border pt-3">
          <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} aria-hidden="true" />
          <span className="truncate text-[11px] font-medium text-text2">{hint}</span>
        </div>
      ) : null}
    </article>
  );
}
