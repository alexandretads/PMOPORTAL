import { Activity } from "lucide-react";
import type { Project } from "@/types";
import { formatDateBR } from "@/lib/format";
import { ProgressDual } from "@/components/ui/ProgressDual";
import { cn } from "@/utils/cn";

interface ProgressCardProps {
  project: Project;
  className?: string;
}

function formatPercentual(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDesvio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const points = value * 100;
  return `${points > 0 ? "+" : ""}${points.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} p.p.`;
}

function MetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "negative" | "positive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 last:border-b-0">
      <dt className="text-[11.5px] font-medium text-text2">{label}</dt>
      <dd
        className={cn(
          "font-display text-[12.5px] font-semibold tabular-nums",
          tone === "negative" && "text-status-danger",
          tone === "positive" && "text-status-ok",
          tone === "default" && "text-text"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ProgressCard({ project, className }: ProgressCardProps) {
  const hasReal = project.avancoReal !== null;
  const hasPrevisto = project.avancoPrevisto !== null;
  const bothNull = !hasReal && !hasPrevisto;

  const desvio =
    project.avancoReal !== null && project.avancoPrevisto !== null
      ? project.avancoReal - project.avancoPrevisto
      : null;

  return (
    <section
      aria-labelledby="progress-title"
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="progress-title"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text2"
        >
          Previsto × Real
        </h2>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <Activity size={14} strokeWidth={1.9} />
        </span>
      </header>

      <div className="mt-4">
        <ProgressDual
          real={project.avancoReal}
          previsto={project.avancoPrevisto}
          showLegend={false}
        />
        <div className="mt-2 flex items-center justify-between text-[9.5px] font-medium text-text2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            Real
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400/60" aria-hidden="true" />
            Previsto
          </span>
        </div>
      </div>

      {bothNull ? (
        <div className="mt-4 rounded-sm border border-border bg-bg px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-text2">
            Sem apuração — bucket operacional não definido.
          </p>
        </div>
      ) : null}

      <dl className="mt-4">
        <MetricRow label="Real" value={formatPercentual(project.avancoReal)} />
        <MetricRow label="Previsto" value={formatPercentual(project.avancoPrevisto)} />
        <MetricRow
          label="Desvio"
          value={formatDesvio(desvio)}
          tone={desvio === null ? "default" : desvio < 0 ? "negative" : desvio > 0 ? "positive" : "default"}
        />
        <MetricRow
          label="Última atualização Planner"
          value={
            project.ultimaAtualizacaoPlanner
              ? formatDateBR(project.ultimaAtualizacaoPlanner)
              : "N/I"
          }
        />
      </dl>
    </section>
  );
}
