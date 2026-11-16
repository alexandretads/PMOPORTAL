import type { Project, StatusKey } from "@/types";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/utils/cn";

interface StatusDistributionProps {
  projects: Project[];
  activeStatus?: StatusKey | null;
  onSelectStatus?: (status: StatusKey | null) => void;
}

export function StatusDistribution({
  projects,
  activeStatus,
  onSelectStatus,
}: StatusDistributionProps) {
  const total = projects.length;
  const rows = STATUS_ORDER.map((status) => ({
    status,
    count: projects.filter((project) => project.status === status).length,
    meta: STATUS_META[status],
  }));

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-text">
            Distribuição por status
          </h2>
          <p className="mt-1 text-[12px] text-text2">Situação reportada no ciclo</p>
        </div>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 text-[11px] font-semibold text-text2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          {total} no total
        </span>
      </header>

      <div className="mt-4 flex-1 space-y-0.5">
        {rows.map(({ status, count, meta }) => {
          const isActive = activeStatus === status;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus?.(isActive ? null : status)}
              disabled={!onSelectStatus}
              aria-pressed={onSelectStatus ? isActive : undefined}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors",
                onSelectStatus ? "hover:bg-bg" : "cursor-default",
                isActive && "bg-brand-50 ring-1 ring-inset ring-brand-100 hover:bg-brand-50"
              )}
            >
              <span className="w-4 text-center text-[11px]" aria-hidden="true">
                {meta.emoji}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[12px] font-medium",
                  count === 0 ? "text-text2" : "text-text",
                  isActive && "text-brand-900"
                )}
              >
                {meta.shortLabel}
              </span>
              <span className="hidden h-1.5 w-[58px] overflow-hidden rounded-full bg-slate-100 sm:block">
                <span
                  className={cn("block h-full rounded-full transition-all duration-500", meta.bar)}
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-7 text-right font-display text-[12px] font-semibold tabular-nums text-text">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <footer className="mt-3 border-t border-border pt-3">
        <p className="text-[10.5px] text-text2">
          {onSelectStatus
            ? "Clique em um status para filtrar a visão."
            : "Contagens refletem os filtros ativos."}
        </p>
      </footer>
    </section>
  );
}
