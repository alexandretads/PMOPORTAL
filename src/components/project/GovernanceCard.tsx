import { CalendarDays, ClipboardList } from "lucide-react";
import type { BinaryStatus, Project, ProjectDocument } from "@/types";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/utils/cn";

interface GovernanceCardProps {
  project: Project;
  className?: string;
}

interface DocumentDefinition {
  key: string;
  label: string;
  aliases: string[];
}

const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  { key: "canvas", label: "Canvas", aliases: ["canvas"] },
  { key: "eap", label: "EAP", aliases: ["eap"] },
  { key: "esg", label: "ESG", aliases: ["esg"] },
  { key: "rip", label: "RIP", aliases: ["rip"] },
  {
    key: "compliance",
    label: "Parecer Compliance",
    aliases: ["compliance", "parecerCompliance", "parecer_compliance"],
  },
  {
    key: "pessoas",
    label: "Viabilidade Pessoas",
    aliases: ["pessoas", "viabilidadePessoas", "viabilidade_pessoas"],
  },
  {
    key: "ti",
    label: "Viabilidade TI",
    aliases: ["ti", "viabilidadeTi", "viabilidade_ti"],
  },
  {
    key: "engenharia",
    label: "Viabilidade Engenharia",
    aliases: ["engenharia", "viabilidadeEngenharia", "viabilidade_engenharia"],
  },
  {
    key: "financeira",
    label: "Viabilidade Financeira",
    aliases: ["financeira", "viabilidadeFinanceira", "viabilidade_financeira"],
  },
  {
    key: "parecerConsolidado",
    label: "Parecer Consolidado",
    aliases: ["parecerConsolidado", "consolidado", "parecer_consolidado"],
  },
  { key: "tap", label: "TAP", aliases: ["tap"] },
  { key: "tep", label: "TEP", aliases: ["tep"] },
  { key: "kickoff", label: "Kick-off", aliases: ["kickoff", "kickOff", "kick_off"] },
  { key: "planner", label: "Planner", aliases: ["planner"] },
];

const STATUS_META: Record<
  BinaryStatus,
  { label: string; className: string; dot: string }
> = {
  SIM: {
    label: "SIM",
    className: "border-status-ok/20 bg-status-ok/10 text-status-ok",
    dot: "bg-status-ok",
  },
  NAO: {
    label: "NÃO",
    className: "border-slate-200 bg-slate-100 text-text2",
    dot: "bg-slate-400",
  },
  NA: {
    label: "N/A",
    className: "border-border bg-slate-50 text-text2/70",
    dot: "bg-slate-300",
  },
  A_DEFINIR: {
    label: "A DEFINIR",
    className: "border-status-warn/20 bg-status-warn/10 text-status-warn",
    dot: "bg-status-warn",
  },
};

function DocumentStatusPill({ status }: { status: BinaryStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-[3px] text-[9px] font-semibold tracking-[0.045em]",
        meta.className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function isValidPlannerUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function openPlanner(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

interface GovernanceItemButtonProps {
  project: Project;
  doc: string;
}

function GovernanceItemButton({ project, doc }: GovernanceItemButtonProps) {
  const definition = DOCUMENT_DEFINITIONS.find((item) => item.key === doc);
  if (!definition) return null;
  if (!isValidPlannerUrl(project.linkPlanner)) return null;

  const document = resolveDocument(project, definition);
  const isCompleted = Boolean(document.dataFinalizacao);
  if (!isCompleted && document.status !== "A_DEFINIR") return null;

  const label = isCompleted ? "Ver ↗" : "Abrir tarefa ↗";
  const title = isCompleted
    ? `Abrir no Planner (tarefa concluída em ${formatDateBR(document.dataFinalizacao)})`
    : "Abrir tarefa pendente no Planner";

  return (
    <button
      type="button"
      onClick={() => openPlanner(project.linkPlanner as string)}
      title={title}
      aria-label={`${label} — ${definition.label}`}
      className="text-xs font-semibold text-brand-500 transition-colors hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
    >
      {label}
    </button>
  );
}

function resolveDocument(project: Project, definition: DocumentDefinition): ProjectDocument {
  for (const alias of definition.aliases) {
    const document = project.documentos[alias];
    if (document) {
      return {
        status:
          document.status === "SIM" ||
          document.status === "NAO" ||
          document.status === "NA" ||
          document.status === "A_DEFINIR"
            ? document.status
            : "A_DEFINIR",
        dataSolicitacao: document.dataSolicitacao ?? null,
        dataFinalizacao: document.dataFinalizacao ?? null,
      };
    }
  }

  return { status: "A_DEFINIR", dataSolicitacao: null, dataFinalizacao: null };
}

export function GovernanceCard({ project, className }: GovernanceCardProps) {
  const totalConcluidos = DOCUMENT_DEFINITIONS.filter(
    (definition) => resolveDocument(project, definition).status === "SIM"
  ).length;

  return (
    <section
      aria-labelledby="governance-title"
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2
            id="governance-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <ClipboardList size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Governança / Artefatos
          </h2>
          <p className="mt-1 text-[11.5px] text-text2">
            Documentos e pareceres que sustentam a governança do projeto.
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 text-[10px] font-semibold text-text2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          {totalConcluidos} de {DOCUMENT_DEFINITIONS.length} concluídos
        </span>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {DOCUMENT_DEFINITIONS.map((definition) => {
          const document = resolveDocument(project, definition);
          return (
            <article
              key={definition.key}
              className="rounded-md border border-border bg-bg/40 px-3.5 py-3 transition-colors hover:border-brand-100 hover:bg-brand-50/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.075em] text-text2">
                  {definition.label}
                </h3>
                <DocumentStatusPill status={document.status} />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-border/70 pt-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-text2/80">
                    <CalendarDays size={9} strokeWidth={2} aria-hidden="true" />
                    Solicitação
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium tabular-nums text-text">
                    {formatDateBR(document.dataSolicitacao)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-text2/80">
                    <CalendarDays size={9} strokeWidth={2} aria-hidden="true" />
                    Finalização
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium tabular-nums text-text">
                    {formatDateBR(document.dataFinalizacao)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex min-h-[18px] items-center justify-end">
                <GovernanceItemButton project={project} doc={definition.key} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
