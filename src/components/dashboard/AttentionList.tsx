import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { Project, StatusKey } from "@/types";
import { ATTENTION_STATUSES } from "@/lib/status";
import { formatPercent } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

interface AttentionListProps {
  projects: Project[];
}

function progressText(project: Project): string {
  if (project.avancoReal === null && project.avancoPrevisto === null) {
    return "Sem tarefas operacionais";
  }
  return `Real ${formatPercent(project.avancoReal)} × Prev ${formatPercent(project.avancoPrevisto)}`;
}

const ATTENTION_PRIORITY: Partial<Record<StatusKey, number>> = {
  atrasado: 0,
  em_atencao: 1,
  sem_apuracao: 2,
};

export function AttentionList({ projects }: AttentionListProps) {
  const attention = projects
    .filter((project) => ATTENTION_STATUSES.includes(project.status))
    .sort((a, b) => {
      const statusDiff =
        (ATTENTION_PRIORITY[a.status] ?? 9) - (ATTENTION_PRIORITY[b.status] ?? 9);
      if (statusDiff !== 0) return statusDiff;
      const aDeviation = a.avancoReal !== null && a.avancoPrevisto !== null
        ? a.avancoReal - a.avancoPrevisto
        : 0;
      const bDeviation = b.avancoReal !== null && b.avancoPrevisto !== null
        ? b.avancoReal - b.avancoPrevisto
        : 0;
      return aDeviation - bDeviation;
    })
    .slice(0, 5);

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-text">
            Atenção requerida
          </h2>
          <p className="mt-1 text-[12px] text-text2">Projetos que pedem acompanhamento</p>
        </div>
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-status-warn/20 bg-status-warn/10 px-2 text-[11px] font-semibold text-status-warn">
          <AlertTriangle size={11} strokeWidth={2.2} aria-hidden="true" />
          {attention.length}
        </span>
      </header>

      {attention.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-ok/10 text-status-ok">
            <CheckCircle2 size={23} strokeWidth={1.7} />
          </span>
          <p className="mt-3 text-[12.5px] font-semibold text-text">Nada pedindo atenção</p>
          <p className="mt-1 max-w-[190px] text-[11px] leading-relaxed text-text2">
            Nenhum projeto em atenção ou sem apuração com os filtros atuais.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex-1 divide-y divide-border">
          {attention.map((project) => (
            <Link
              key={project.id}
              to={`/projetos/${encodeURIComponent(project.id)}`}
              className="group -mx-2 flex items-start gap-2.5 rounded-sm px-2 py-3 transition-colors hover:bg-bg"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusPill status={project.status} compact />
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2">
                    #{project.id}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[12.5px] font-semibold leading-snug text-text">
                  {project.nome}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-text2">
                  {progressText(project)}
                </p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-brand-700 transition-colors group-hover:text-brand-900">
                Abrir
                <ArrowRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-2 border-t border-border pt-3">
        <Link
          to="/projetos"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
        >
          Ver portfólio completo
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
