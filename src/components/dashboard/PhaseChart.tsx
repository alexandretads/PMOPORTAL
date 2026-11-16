import { Layers } from "lucide-react";
import type { Project } from "@/types";
import { PHASES, normalizeKey } from "@/lib/normalize";
import { cn } from "@/utils/cn";

interface PhaseChartProps {
  projects: Project[];
  activePhase?: string | null;
  onSelectPhase?: (phase: string | null) => void;
}

export function PhaseChart({ projects, activePhase, onSelectPhase }: PhaseChartProps) {
  const counts = PHASES.map((phase) => ({
    phase,
    count: projects.filter((project) => normalizeKey(project.fase) === normalizeKey(phase)).length,
  }));
  const maxCount = Math.max(...counts.map((item) => item.count), 1);
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const interactive = Boolean(onSelectPhase);
  const nonCanonical = projects.filter(
    (project) => !PHASES.some((phase) => normalizeKey(phase) === normalizeKey(project.fase))
  ).length;

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-text">
            Projetos por fase
          </h2>
          <p className="mt-1 text-[12px] text-text2">Distribuição do portfólio no ciclo atual</p>
        </div>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 text-[11px] font-semibold text-text2">
          <Layers size={12} strokeWidth={2} aria-hidden="true" />
          {total} {total === 1 ? "projeto" : "projetos"}
        </span>
      </header>

      <div className="mt-5 flex-1 space-y-1.5">
        {counts.map(({ phase, count }, index) => {
          const isActive = Boolean(activePhase && normalizeKey(activePhase) === normalizeKey(phase));
          const width = count === 0 ? 0 : Math.max((count / maxCount) * 100, 6);
          return (
            <button
              key={phase}
              type="button"
              onClick={() => {
                if (!onSelectPhase || count === 0) return;
                onSelectPhase(isActive ? null : phase);
              }}
              disabled={!interactive || count === 0}
              aria-pressed={interactive ? isActive : undefined}
              className={cn(
                "group grid w-full grid-cols-[112px_minmax(0,1fr)_20px] items-center gap-2.5 rounded-sm px-1.5 py-1.5 text-left transition-colors sm:grid-cols-[150px_minmax(0,1fr)_24px] sm:gap-3",
                interactive && count > 0 ? "hover:bg-bg" : "cursor-default",
                isActive && "bg-brand-50 hover:bg-brand-50"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "w-3.5 shrink-0 font-mono text-[9px] tabular-nums",
                    isActive ? "text-brand-700" : "text-text2/60"
                  )}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "truncate text-[11.5px] transition-colors sm:text-[12px]",
                    count > 0 ? "font-medium text-text" : "text-text2",
                    isActive && "font-semibold text-brand-700"
                  )}
                  title={phase}
                >
                  {phase}
                </span>
              </span>

              <span className="relative h-[18px] overflow-hidden rounded-[4px] bg-slate-50">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />
                {count > 0 ? (
                  <span
                    className={cn(
                      "absolute inset-y-[3px] left-0 rounded-[3px] bg-gradient-to-r shadow-sm transition-all duration-300",
                      isActive
                        ? "from-brand-900 to-brand-500"
                        : "from-brand-700 to-brand-500 group-hover:from-brand-900"
                    )}
                    style={{ width: `${width}%` }}
                  />
                ) : null}
              </span>

              <span
                className={cn(
                  "text-right font-display text-[12px] font-semibold tabular-nums",
                  count > 0 ? "text-text" : "text-text2/50"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-[10.5px] text-text2">
          {interactive ? "Clique em uma fase para filtrar o painel." : "Atualizado com os filtros ativos."}
        </span>
        {nonCanonical > 0 ? (
          <span className="text-[10.5px] font-medium text-text2">+{nonCanonical} sem fase</span>
        ) : null}
      </footer>
    </section>
  );
}
