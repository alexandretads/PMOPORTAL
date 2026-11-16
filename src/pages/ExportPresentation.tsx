import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Layers,
  Printer,
  Target,
  TrendingUp,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import type { BinaryStatus, Project, ProjectDocument, StatusKey } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { normalizeProjectCollection } from "@/lib/projectSchema";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { normalizeKey, PHASES } from "@/lib/normalize";
import { formatDateBR, formatDelta, formatPercent } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";

const DOCUMENTS: Array<{ key: string; label: string; aliases: string[] }> = [
  { key: "canvas", label: "Canvas", aliases: ["canvas"] },
  { key: "eap", label: "EAP", aliases: ["eap"] },
  { key: "esg", label: "ESG", aliases: ["esg"] },
  { key: "rip", label: "RIP", aliases: ["rip"] },
  { key: "compliance", label: "Compliance", aliases: ["compliance", "parecerCompliance"] },
  { key: "pessoas", label: "Pessoas", aliases: ["pessoas", "viabilidadePessoas"] },
  { key: "ti", label: "TI", aliases: ["ti", "viabilidadeTi"] },
  { key: "engenharia", label: "Engenharia", aliases: ["engenharia", "viabilidadeEngenharia"] },
  { key: "financeira", label: "Financeira", aliases: ["financeira", "viabilidadeFinanceira"] },
  { key: "parecerConsolidado", label: "Parecer", aliases: ["parecerConsolidado", "consolidado"] },
  { key: "tap", label: "TAP", aliases: ["tap"] },
  { key: "tep", label: "TEP", aliases: ["tep"] },
  { key: "kickoff", label: "Kick-off", aliases: ["kickoff", "kickOff"] },
  { key: "planner", label: "Planner", aliases: ["planner"] },
];

const DOCUMENT_STATUS_STYLE: Record<BinaryStatus, { label: string; className: string }> = {
  SIM: { label: "SIM", className: "doc-pill doc-pill--yes" },
  NAO: { label: "NÃO", className: "doc-pill doc-pill--no" },
  NA: { label: "N/A", className: "doc-pill doc-pill--na" },
  A_DEFINIR: { label: "A DEFINIR", className: "doc-pill doc-pill--pending" },
};

function resolveDocument(project: Project, aliases: string[]): ProjectDocument {
  for (const alias of aliases) {
    const document = project.documentos[alias];
    if (document) return document;
  }
  return { status: "A_DEFINIR", dataSolicitacao: null, dataFinalizacao: null };
}

function statusLabel(status: StatusKey): string {
  return STATUS_META[status].label;
}

function statusClass(status: StatusKey): string {
  return `presentation-status presentation-status--${status}`;
}

function valueOrDash(value: string): string {
  return value.trim() || "—";
}

function countByPhase(projects: Project[]): Array<{ phase: string; count: number }> {
  return PHASES.map((phase) => ({
    phase,
    count: projects.filter((project) => normalizeKey(project.fase) === normalizeKey(phase)).length,
  }));
}

function countByPmo(projects: Project[]): Array<{ pmo: string; count: number }> {
  const map = new Map<string, number>();
  for (const project of projects) {
    const key = project.pmo.trim() || "Não atribuído";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([pmo, count]) => ({ pmo, count }))
    .sort((a, b) => b.count - a.count || a.pmo.localeCompare(b.pmo, "pt-BR"));
}

function statusCount(projects: Project[], status: StatusKey): number {
  return projects.filter((project) => project.status === status).length;
}

function PresentationBrand() {
  return (
    <div className="presentation-brand">
      <span className="presentation-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
          <path d="M3 12h3.2l2.1-4.8 3.2 9.6 2.2-4.8H21" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <p className="presentation-brand__title">Portal PMO</p>
        <p className="presentation-brand__subtitle">Unimed Campo Grande</p>
      </div>
    </div>
  );
}

function CoverSlide({
  projects,
  reportDate,
  isSingleProject,
}: {
  projects: Project[];
  reportDate: Date;
  isSingleProject: boolean;
}) {
  const phases = countByPhase(projects).filter((entry) => entry.count > 0);
  const pmos = countByPmo(projects);
  const maxPhase = Math.max(...phases.map((entry) => entry.count), 1);

  return (
    <section className="presentation-page presentation-cover">
      <header className="presentation-cover__header">
        <PresentationBrand />
        <span className="presentation-cover__tag">Relatório executivo</span>
      </header>

      <div className="presentation-cover__body">
        <p className="presentation-eyebrow">Acompanhamento do portfólio</p>
        <h1 className="presentation-cover__title">Acompanhamento Semanal de Projetos</h1>
        <p className="presentation-cover__subtitle">
          {isSingleProject ? "Lâmina executiva do projeto" : "Visão consolidada do portfólio"} ·{" "}
          {format(reportDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>

        <div className="presentation-cover__grid">
          <div className="presentation-stat presentation-stat--accent">
            <span className="presentation-stat__icon">
              <Layers size={16} aria-hidden="true" />
            </span>
            <span className="presentation-stat__value">{projects.length}</span>
            <span className="presentation-stat__label">Projetos no recorte</span>
          </div>
          <div className="presentation-stat">
            <span className="presentation-stat__icon">
              <Target size={16} aria-hidden="true" />
            </span>
            <span className="presentation-stat__value">
              {projects.filter((project) => normalizeKey(project.fase) === "execucao").length}
            </span>
            <span className="presentation-stat__label">Em execução</span>
          </div>
          <div className="presentation-stat">
            <span className="presentation-stat__icon">
              <TrendingUp size={16} aria-hidden="true" />
            </span>
            <span className="presentation-stat__value">
              {projects.filter((project) => project.status === "em_atencao").length}
            </span>
            <span className="presentation-stat__label">Em atenção</span>
          </div>
          <div className="presentation-stat">
            <span className="presentation-stat__icon">
              <CheckCircle2 size={16} aria-hidden="true" />
            </span>
            <span className="presentation-stat__value">
              {projects.filter((project) => project.status === "encerrado").length}
            </span>
            <span className="presentation-stat__label">Encerrados</span>
          </div>
        </div>

        <div className="presentation-cover__details">
          <div className="presentation-cover__block">
            <h2 className="presentation-section-title">Projetos por fase</h2>
            <div className="presentation-phase-list">
              {phases.map((entry) => (
                <div key={entry.phase} className="presentation-phase-row">
                  <span className="presentation-phase-row__label">{entry.phase}</span>
                  <span className="presentation-phase-row__track">
                    <span
                      className="presentation-phase-row__fill"
                      style={{ width: `${Math.max((entry.count / maxPhase) * 100, 6)}%` }}
                    />
                  </span>
                  <span className="presentation-phase-row__value">{entry.count}</span>
                </div>
              ))}
              {phases.length === 0 ? (
                <p className="presentation-empty">Nenhum projeto no recorte.</p>
              ) : null}
            </div>
          </div>

          <div className="presentation-cover__block">
            <h2 className="presentation-section-title">Distribuição por PMO</h2>
            <div className="presentation-pmo-list">
              {pmos.map((entry) => (
                <div key={entry.pmo} className="presentation-pmo-row">
                  <span className="presentation-pmo-row__dot" aria-hidden="true" />
                  <span className="presentation-pmo-row__name">{entry.pmo}</span>
                  <span className="presentation-pmo-row__value">{entry.count}</span>
                </div>
              ))}
              {pmos.length === 0 ? (
                <p className="presentation-empty">Nenhum PMO atribuído.</p>
              ) : null}
            </div>

            <div className="presentation-status-summary">
              {STATUS_ORDER.map((status) => {
                const count = statusCount(projects, status);
                if (count === 0) return null;
                return (
                  <span key={status} className={statusClass(status)}>
                    {statusLabel(status)} · {count}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="presentation-footer">
        <span>Portal PMO · Unimed Campo Grande</span>
        <span>Gerado em {format(reportDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
      </footer>
    </section>
  );
}

function ProjectSlide({ project, index, total }: { project: Project; index: number; total: number }) {
  const tasks = project.tarefasPriorizadas
    .map((task) => task.trim())
    .filter((task) => task.length > 0)
    .slice(0, 5);

  return (
    <section className="presentation-page presentation-project">
      <header className="presentation-project__header">
        <div className="presentation-project__heading">
          <p className="presentation-eyebrow">
            Projeto {String(index + 1).padStart(2, "0")} de {String(total).padStart(2, "0")} · ID{" "}
            {project.id}
          </p>
          <h2 className="presentation-project__title">{project.nome}</h2>
          <p className="presentation-project__meta">
            {[project.tipo || "Sem tipo", project.fase || "Fase não informada", project.chamadoTopDesk]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className={statusClass(project.status)}>{statusLabel(project.status)}</span>
      </header>

      <div className="presentation-project__info">
        <div className="presentation-info">
          <span className="presentation-info__label">Sponsor</span>
          <span className="presentation-info__value">{valueOrDash(project.sponsor)}</span>
        </div>
        <div className="presentation-info">
          <span className="presentation-info__label">Líder</span>
          <span className="presentation-info__value">{valueOrDash(project.lider)}</span>
        </div>
        <div className="presentation-info">
          <span className="presentation-info__label">PMO</span>
          <span className="presentation-info__value">{valueOrDash(project.pmo)}</span>
        </div>
        <div className="presentation-info">
          <span className="presentation-info__label">Fase</span>
          <span className="presentation-info__value">{valueOrDash(project.fase)}</span>
        </div>
        <div className="presentation-info">
          <span className="presentation-info__label">Início</span>
          <span className="presentation-info__value">
            {project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir"}
          </span>
        </div>
        <div className="presentation-info">
          <span className="presentation-info__label">Prev. término</span>
          <span className="presentation-info__value">
            {project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir"}
          </span>
        </div>
      </div>

      <div className="presentation-project__row presentation-project__row--split">
        <div className="presentation-card">
          <h3 className="presentation-card__title">Resumo executivo</h3>
          <p className="presentation-card__text presentation-clamp">
            {project.resumoExecutivo.trim() || "Sem atualização registrada."}
          </p>
        </div>
        <div className="presentation-card">
          <h3 className="presentation-card__title">Impedimentos</h3>
          <p className="presentation-card__text presentation-clamp">
            {project.impedimentos.trim() || "Nenhum impedimento registrado."}
          </p>
        </div>
      </div>

      <div className="presentation-project__row">
        <div className="presentation-card">
          <div className="presentation-card__title-row">
            <h3 className="presentation-card__title">Previsto × Executado</h3>
            <span className="presentation-progress__legend">
              <span className="presentation-dot presentation-dot--real" aria-hidden="true" /> Real
              <span className="presentation-dot presentation-dot--forecast" aria-hidden="true" /> Previsto
            </span>
          </div>

          <div className="presentation-progress">
            <span
              className="presentation-progress__forecast"
              style={{ width: `${Math.min(100, Math.max(0, (project.avancoPrevisto ?? 0) * 100))}%` }}
            />
            <span
              className="presentation-progress__real"
              style={{ width: `${Math.min(100, Math.max(0, (project.avancoReal ?? 0) * 100))}%` }}
            />
            {project.avancoPrevisto !== null ? (
              <span
                className="presentation-progress__marker"
                style={{ left: `calc(${Math.min(100, Math.max(0, project.avancoPrevisto * 100))}% - 1px)` }}
              />
            ) : null}
          </div>

          <div className="presentation-progress__metrics">
            <div>
              <span className="presentation-info__label">Real</span>
              <strong>{formatPercent(project.avancoReal)}</strong>
            </div>
            <div>
              <span className="presentation-info__label">Previsto</span>
              <strong>{formatPercent(project.avancoPrevisto)}</strong>
            </div>
            <div>
              <span className="presentation-info__label">Desvio</span>
              <strong
                className={
                  project.avancoReal !== null &&
                  project.avancoPrevisto !== null &&
                  project.avancoReal - project.avancoPrevisto < 0
                    ? "presentation-negative"
                    : "presentation-positive"
                }
              >
                {project.avancoReal !== null && project.avancoPrevisto !== null
                  ? formatDelta(project.avancoReal - project.avancoPrevisto)
                  : "—"}
              </strong>
            </div>
            <div>
              <span className="presentation-info__label">Última atualização Planner</span>
              <strong>{formatDateBR(project.ultimaAtualizacaoPlanner) || "N/I"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="presentation-project__row presentation-project__row--bottom">
        <div className="presentation-card">
          <h3 className="presentation-card__title">Tarefas críticas</h3>
          {tasks.length > 0 ? (
            <ol className="presentation-tasks">
              {tasks.map((task, taskIndex) => (
                <li key={`${task}-${taskIndex}`} className="presentation-tasks__item">
                  <span className="presentation-tasks__index">{String(taskIndex + 1).padStart(2, "0")}</span>
                  <span className="presentation-tasks__dot" aria-hidden="true" />
                  <span className="presentation-tasks__text">{task}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="presentation-empty">Nenhuma tarefa priorizada registrada.</p>
          )}
        </div>

        <div className="presentation-card">
          <h3 className="presentation-card__title">Governança / Artefatos</h3>
          <div className="presentation-docs">
            {DOCUMENTS.map((definition) => {
              const document = resolveDocument(project, definition.aliases);
              const status = DOCUMENT_STATUS_STYLE[document.status];
              return (
                <div key={definition.key} className="presentation-doc">
                  <span className="presentation-doc__label">{definition.label}</span>
                  <span className={status.className}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="presentation-footer">
        <span>Portal PMO · Unimed Campo Grande</span>
        <span>
          {project.nome} · {formatDateBR(project.ultimaAtualizacaoPlanner) || "N/I"}
        </span>
      </footer>
    </section>
  );
}

export function ExportPresentation() {
  const [searchParams] = useSearchParams();
  const storedProjects = usePortfolioStore((state) => state.projects);
  const projects = useMemo(
    () => normalizeProjectCollection(storedProjects).projects as Project[],
    [storedProjects]
  );
  const lastStatusUpload = usePortfolioStore((state) => state.lastStatusUpload);
  const [didPrint, setDidPrint] = useState(false);
  const reportDate = useMemo(() => new Date(), []);
  const requestedId = searchParams.get("id");

  const selectedProjects = useMemo(() => {
    if (!requestedId) return projects;
    const project = projects.find((item) => item.id === requestedId);
    return project ? [project] : [];
  }, [projects, requestedId]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = requestedId
      ? `Apresentação · ${selectedProjects[0]?.nome ?? "Projeto"}`
      : "Apresentação do Portfólio · Portal PMO";
    return () => {
      document.title = previousTitle;
    };
  }, [requestedId, selectedProjects]);

  useEffect(() => {
    if (didPrint || selectedProjects.length === 0) return;
    const timer = window.setTimeout(() => {
      setDidPrint(true);
      window.print();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [didPrint, selectedProjects.length]);

  if (requestedId && selectedProjects.length === 0) {
    return (
      <div className="presentation-screen flex min-h-screen items-center justify-center p-6">
        <EmptyState
          icon={Layers}
          title="Projeto não encontrado"
          description="Não há projeto com este identificador no portfólio atual."
          action={
            <Link
              to="/projetos"
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-brand-700 px-4 text-[11.5px] font-semibold text-white"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Voltar aos projetos
            </Link>
          }
        />
      </div>
    );
  }

  const backHref = requestedId ? `/projetos/${requestedId}` : "/";

  return (
    <div className="presentation-screen">
      <div className="presentation-toolbar presentation-no-print">
        <div className="presentation-toolbar__info">
          <PresentationBrand />
          <span className="presentation-toolbar__divider" aria-hidden="true" />
          <div>
            <p className="presentation-toolbar__title">
              {requestedId ? "Apresentação do projeto" : "Apresentação do portfólio"}
            </p>
            <p className="presentation-toolbar__subtitle">
              {selectedProjects.length} {selectedProjects.length === 1 ? "projeto" : "projetos"} ·{" "}
              {lastStatusUpload?.ciclo ?? "Demonstração"} · A4 paisagem
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={backHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-text2 transition-colors hover:bg-bg hover:text-text"
          >
            <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-900"
          >
            <Printer size={14} strokeWidth={2} aria-hidden="true" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <div className="presentation-note presentation-no-print">
        <CalendarCheck size={13} strokeWidth={2} aria-hidden="true" />
        <span>
          Relatório em formato de slides. Na janela de impressão, escolha <strong>A4 paisagem</strong>{" "}
          e mantenha <strong>“Gráficos de fundo”</strong> ativado para preservar as cores.
        </span>
        <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
      </div>

      <main className="presentation-document">
        {!requestedId ? (
          <CoverSlide
            projects={selectedProjects}
            reportDate={reportDate}
            isSingleProject={false}
          />
        ) : null}

        {selectedProjects.map((project, index) => (
          <ProjectSlide
            key={project.id}
            project={project}
            index={index}
            total={selectedProjects.length}
          />
        ))}
      </main>

      <div className="presentation-toolbar presentation-toolbar--bottom presentation-no-print">
        <p className="text-[10.5px] text-text2">
          {selectedProjects.length + (requestedId ? 0 : 1)} páginas ·{" "}
          {requestedId ? "slide do projeto" : "capa + slides dos projetos"}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-900"
        >
          <Printer size={14} strokeWidth={2} aria-hidden="true" />
          Imprimir / Salvar PDF
        </button>
      </div>
    </div>
  );
}
