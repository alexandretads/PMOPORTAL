import { useMemo, useRef } from "react";
import logoUnimed from "../assets/logo-unimed.svg?inline";
import logoUnimedDark from "../assets/logo-unimed-dark.svg?inline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { Project, ProjectDocument } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { formatDateBR, formatDelta, formatPercent } from "@/lib/format";
import { normalizeKey } from "@/lib/normalize";

/* =========================================================================
   Apresentação executiva — modelo oficial PMO (PowerPoint 16:9)
   Cada slide tem 1280×720 na tela e uma página A4 paisagem na impressão.
   Todas as lâminas usam alturas rígidas para não esticar/transbordar.
   ========================================================================= */

const KNOWN_PMOS = ["Alexandre", "Bruno", "Fernando"] as const;
const PMO_ROWS_PER_SLIDE = 9;

const TOTAL_PHASES = [
  "Ideia",
  "Análise",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
  "Parado",
  "Cancelado",
] as const;

const CATEGORY_PHASES = [
  "Ideia",
  "Análise",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
  "Prioridade",
  "A definir",
] as const;

const PLAN_PHASES = ["Execução", "Parado", "Cancelado"] as const;

const DOCUMENTS = [
  { label: "Canvas", aliases: ["canvas"] },
  { label: "EAP", aliases: ["eap"] },
  { label: "ESG", aliases: ["esg"] },
  { label: "RIP", aliases: ["rip"] },
  { label: "Compliance", aliases: ["compliance", "parecerCompliance"] },
  { label: "Pessoas", aliases: ["pessoas", "viabilidadePessoas"] },
  { label: "TI", aliases: ["ti", "viabilidadeTi"] },
  { label: "Engenharia", aliases: ["engenharia", "viabilidadeEngenharia"] },
  { label: "Financeiro", aliases: ["financeira", "viabilidadeFinanceira"] },
  { label: "Parecer", aliases: ["parecerConsolidado", "consolidado"] },
  { label: "TAP", aliases: ["tap"] },
  { label: "TEP", aliases: ["tep"] },
  { label: "Kick-off", aliases: ["kickoff", "kickOff"] },
  { label: "Planner", aliases: ["planner"] },
] as const;

/* ---------------------------------- dados --------------------------------- */

type TipoKey = "estrategico" | "tatico" | "plano";
type StatusKey = "no_prazo" | "em_atencao" | "atrasado" | "sem_apuracao";

interface StatusStyle {
  label: string;
  pill: string;
}

const STATUS_STYLE: Record<StatusKey, StatusStyle> = {
  no_prazo: { label: "NO PRAZO", pill: "bg-emerald-100 text-emerald-700" },
  em_atencao: { label: "EM ATENÇÃO", pill: "bg-amber-100 text-amber-700" },
  atrasado: { label: "ATRASADO", pill: "bg-red-100 text-red-700" },
  sem_apuracao: { label: "SEM APURAÇÃO", pill: "bg-slate-100 text-slate-600" },
};

/**
 * Status exibido nas tabelas e lâminas é sempre calculado pelo desvio entre
 * avanço real e previsto; nunca usamos texto puro do campo `status`.
 */
function resolveStatus(project: Project): StatusKey {
  if (project.avancoReal === null || project.avancoPrevisto === null) {
    return "sem_apuracao";
  }
  const desvio = project.avancoReal - project.avancoPrevisto;
  if (desvio < -0.1) return "atrasado";
  if (desvio < 0) return "em_atencao";
  return "no_prazo";
}

function tipoKey(project: Project): TipoKey | null {
  const key = normalizeKey(project.tipo);
  if (key.includes("estrateg")) return "estrategico";
  if (key.includes("tatic")) return "tatico";
  if (key.includes("plano") || key.includes("acao")) return "plano";
  return null;
}

function faseKey(project: Project): string {
  const key = normalizeKey(project.fase);
  if (key.includes("ideia")) return "ideia";
  if (key.includes("analise") || key.includes("viabilidade")) return "analise";
  if (key.includes("aprovacao")) return "aprovacao";
  if (key.includes("planejamento")) return "planejamento";
  if (key.includes("execucao")) return "execucao";
  if (key.includes("encerramento")) return "encerramento";
  if (key.includes("prioridade")) return "prioridade";
  if (key.includes("cancel")) return "cancelado";
  if (key.includes("parad") || key.includes("pausad") || key.includes("suspens")) return "parado";
  return "a_definir";
}

function categoryPhaseLabel(project: Project): string {
  const key = faseKey(project);
  if (key === "ideia") return "Ideia";
  if (key === "analise") return "Análise";
  if (key === "aprovacao") return "Aprovação";
  if (key === "planejamento") return "Planejamento";
  if (key === "execucao") return "Execução";
  if (key === "encerramento") return "Encerramento";
  if (key === "prioridade") return "Prioridade";
  return "A definir";
}

function totalPhaseLabel(project: Project): string {
  const key = faseKey(project);
  if (key === "ideia") return "Ideia";
  if (key === "analise") return "Análise";
  if (key === "aprovacao") return "Aprovação";
  if (key === "planejamento") return "Planejamento";
  if (key === "execucao") return "Execução";
  if (key === "encerramento") return "Encerramento";
  if (key === "cancelado") return "Cancelado";
  return "Parado";
}

function planPhaseLabel(project: Project): string {
  const key = faseKey(project);
  if (key === "execucao") return "Execução";
  if (key === "cancelado") return "Cancelado";
  return "Parado";
}

function pmoLabel(project: Project): string {
  return safeText(project.pmo, "Não atribuído");
}

function resolveDocument(project: Project, aliases: readonly string[]) {
  const documents = project.documentos ?? {};
  for (const alias of aliases) {
    const document = documents[alias];
    if (document) return document;
  }
  return undefined;
}

/** Formata a data de finalização sem criar Date a partir de string. */
function formatDocumentDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return null;
}

function chunkRows<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/* --------------------------- blindagem de dados ---------------------------- */

function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim() || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function safePercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function safeDocument(value: unknown): ProjectDocument {
  const record = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const status = record.status;
  return {
    status:
      status === "SIM" || status === "NAO" || status === "NA" || status === "A_DEFINIR"
        ? status
        : "A_DEFINIR",
    dataSolicitacao: typeof record.dataSolicitacao === "string" ? record.dataSolicitacao : null,
    dataFinalizacao: typeof record.dataFinalizacao === "string" ? record.dataFinalizacao : null,
  };
}

/**
 * Normaliza um projeto vindo do store/backup. Garante que campos nulos,
 * ausentes ou com tipo errado não quebrem nenhuma renderização/exportação.
 */
function normalizeProject(input: unknown, index: number): Project | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const id = safeText(record.id, `sem-id-${index + 1}`);

  const documents: Record<string, ProjectDocument> = {};
  if (typeof record.documentos === "object" && record.documentos !== null) {
    for (const [key, value] of Object.entries(record.documentos)) {
      documents[key] = safeDocument(value);
    }
  }

  const tasks = Array.isArray(record.tarefasPriorizadas)
    ? record.tarefasPriorizadas.map((task) => safeText(task)).filter(Boolean)
    : [];

  return {
    id,
    ata: safeText(record.ata),
    tipo: safeText(record.tipo),
    fase: safeText(record.fase),
    faseOrdem: typeof record.faseOrdem === "number" && Number.isFinite(record.faseOrdem) ? record.faseOrdem : 0,
    nome: safeText(record.nome, `Projeto ${id}`),
    sponsor: safeText(record.sponsor),
    lider: safeText(record.lider),
    pmo: safeText(record.pmo),
    emailLider: safeText(record.emailLider),
    avancoPrevisto: safePercent(record.avancoPrevisto),
    avancoReal: safePercent(record.avancoReal),
    status:
      record.status === "no_prazo" ||
      record.status === "em_atencao" ||
      record.status === "atrasado" ||
      record.status === "sem_apuracao" ||
      record.status === "parado" ||
      record.status === "encerrado"
        ? record.status
        : "sem_apuracao",
    resumoExecutivo: safeText(record.resumoExecutivo),
    impedimentos: safeText(record.impedimentos),
    tarefasPriorizadas: tasks,
    previsaoGoLive: typeof record.previsaoGoLive === "string" ? record.previsaoGoLive : null,
    chamadoTopDesk: safeText(record.chamadoTopDesk),
    linkPlanner: typeof record.linkPlanner === "string" ? record.linkPlanner : null,
    ultimaAtualizacaoPlanner:
      typeof record.ultimaAtualizacaoPlanner === "string" ? record.ultimaAtualizacaoPlanner : null,
    dataUltimaReuniao: typeof record.dataUltimaReuniao === "string" ? record.dataUltimaReuniao : null,
    dataProximaReuniao: typeof record.dataProximaReuniao === "string" ? record.dataProximaReuniao : null,
    documentos: documents,
  };
}

function normalizeProjects(input: unknown): Project[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const projects: Project[] = [];
  input.forEach((item, index) => {
    const project = normalizeProject(item, index);
    if (!project || seen.has(project.id)) return; // ids duplicados quebrariam bookmarks
    seen.add(project.id);
    projects.push(project);
  });
  return projects;
}

/* -------------------------------- primitivos ------------------------------ */

function Slide({
  children,
  dark = false,
  id,
}: {
  children: React.ReactNode;
  dark?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`slide-page w-[1280px] h-[720px] p-8 box-border flex flex-col justify-between overflow-hidden break-inside-avoid break-after-page relative rounded-xl border border-slate-200 shadow-lg mb-8 ${
        dark ? "bg-[#003D2E]" : "bg-white"
      }`}
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
        scrollMarginTop: "24px",
      }}
    >
      {children}
    </section>
  );
}

function Logo() {
  return (
    <div className="flex items-center">
      {/* Variante verde, para fundos claros (barra da apresentação). */}
      <img src={logoUnimedDark} alt="Unimed Campo Grande" className="h-10 w-auto object-contain" />
    </div>
  );
}

/** Pílula sempre colorida; o status nunca é escrito como texto puro. */
function StatusPill({ project, large = false }: { project: Project; large?: boolean }) {
  const key = resolveStatus(project);
  const style = STATUS_STYLE[key];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-bold ${style.pill} ${
        large ? "px-3 py-1.5 text-[11px]" : "px-2 py-1 text-xs"
      }`}
      title={`Desvio: ${
        project.avancoReal !== null && project.avancoPrevisto !== null
          ? formatDelta(project.avancoReal - project.avancoPrevisto)
          : "sem apuração"
      }`}
    >
      {style.label}
    </span>
  );
}

function SlideHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-6 px-2">
      <div className="min-w-0">
        <h2 className="truncate text-2xl font-bold leading-tight text-[#006B4F]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

/* --------------------------------- slides --------------------------------- */

function CoverSlide({ projects, id }: { projects: Project[]; id: string }) {
  const emExecucao = projects.filter((project) => faseKey(project) === "execucao").length;
  const estrategicos = projects.filter((project) => tipoKey(project) === "estrategico").length;
  const parados = projects.filter((project) => faseKey(project) === "parado").length;
  const cards = [
    { value: projects.length, label: "Total de Projetos" },
    { value: emExecucao, label: "Em execução" },
    { value: estrategicos, label: "Estratégicos" },
    { value: parados, label: "Parados" },
  ];

  return (
    <Slide dark id={id}>
      <div className="flex h-full flex-col justify-between">
        <header className="flex flex-col items-center">
          <img
            src={logoUnimed}
            alt="Unimed"
            className="h-16 mx-auto mb-8 w-auto object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
          />
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Relatório executivo
          </span>
        </header>

        <div className="max-w-[980px]">
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-12 bg-[#00A67A]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00A67A]">
              Acompanhamento semanal do portfólio
            </p>
          </div>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-white">
            Acompanhamento Semanal de Projetos
          </h1>
          <p className="mt-4 text-2xl font-medium text-white/90">PMO Unimed Campo Grande</p>
          <p className="mt-2 text-sm text-white/55">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {cards.map((card, index) => (
            <div key={card.label} className="rounded-xl bg-white p-6 text-[#003D2E]">
              <span className={`block h-1 w-8 rounded-full ${index === 0 ? "bg-[#003D2E]" : "bg-[#00A67A]"}`} />
              <p className="mt-3 text-4xl font-bold leading-none tabular-nums">{card.value}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

function PhaseSlide({
  title,
  subtitle,
  blockLabel,
  phases,
  resolver,
  projects,
  id,
}: {
  title: string;
  subtitle: string;
  blockLabel: string;
  phases: readonly string[];
  resolver: (project: Project) => string;
  projects: Project[];
  id: string;
}) {
  const counts = phases.map((phase) => ({
    phase,
    count: projects.filter((project) => resolver(project) === phase).length,
  }));
  const isPlan = phases.length === 3;

  return (
    <Slide id={id}>
      <SlideHeading title={title} subtitle={subtitle} />

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-6">
        <div className="flex min-h-0 flex-1 items-center">
        <div className="flex h-64 w-full gap-6">
          <div className="flex w-64 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#003D2E] px-6 text-white">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">{blockLabel}</p>
            <p className="mt-2 text-7xl font-bold leading-none tabular-nums">{projects.length}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Projetos</p>
            <span className="mt-5 block h-1 w-10 rounded-full bg-[#00A67A]" />
          </div>

          <div className={`grid min-w-0 flex-1 gap-4 ${isPlan ? "grid-cols-3" : "grid-cols-8"}`}>
            {counts.map((entry) => (
              <div
                key={entry.phase}
                className="flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-4"
              >
                <p
                  className={`text-3xl font-bold leading-none tabular-nums ${
                    entry.count > 0 ? "text-[#006B4F]" : "text-slate-300"
                  }`}
                >
                  {entry.count}
                </p>
                <span
                  className={`mt-3 block h-[3px] w-7 rounded-full ${
                    entry.count > 0 ? "bg-[#00A67A]" : "bg-slate-200"
                  }`}
                />
                <p className="mt-3 text-center text-[9px] font-semibold uppercase leading-[1.35] text-slate-500">
                  {entry.phase}
                </p>
              </div>
            ))}
          </div>
        </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          <span className="font-medium text-slate-500">
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"} · {counts.reduce((total, entry) => total + entry.count, 0)} classificados
          </span>
          <span>Fonte: Status dos Projetos · atualização de {format(new Date(), "dd/MM/yyyy")}</span>
        </footer>
      </div>
    </Slide>
  );
}

function pmoBookmark(pmo: string): string {
  const slug =
    normalizeKey(pmo)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sem-pmo";
  return `pmo-${slug}`;
}

function projectBookmark(projectId: string): string {
  return `projeto-${projectId}`;
}

function PmoSlide({
  pmo,
  projects,
  part,
  parts,
  id,
}: {
  pmo: string;
  projects: Project[];
  part: number;
  parts: number;
  id: string;
}) {
  const summary = [
    `${projects.length} ${projects.length === 1 ? "Projeto" : "Projetos"} do PMO`,
    ...CATEGORY_PHASES.map((phase) => ({
      phase,
      count: projects.filter((project) => categoryPhaseLabel(project) === phase).length,
    }))
      .filter((entry) => entry.count > 0)
      .map((entry) => `${entry.count} ${entry.phase}`),
  ].join(" | ");

  return (
    <Slide id={id}>
      <SlideHeading
        title={`Acompanhamento Semanal | PMO ${pmo}`}
        subtitle={
          parts > 1
            ? part > 1
              ? `Continuação · parte ${part} de ${parts}`
              : `Lista paginada em ${parts} partes`
            : undefined
        }
      />

      <div className="rounded-r-lg border-l-4 border-[#006B4F] bg-[#E8F5F1] p-3 text-sm font-semibold text-[#003D2E]">
        {summary}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 break-inside-avoid"
        style={NO_BREAK}
      >
        {/* Cabeçalho do grid */}
        <div className="grid shrink-0 grid-cols-[92px_104px_minmax(0,1fr)_126px_74px_74px_128px] border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          {["Chamado", "Tipo", "Projeto", "Fase", "% Prev.", "% Real", "Status"].map((column, index) => (
            <div
              key={column}
              className={`flex h-8 items-center px-2 font-semibold ${
                index === 4 || index === 5 ? "justify-center text-center" : "justify-start"
              }`}
            >
              <span className="truncate">{column}</span>
            </div>
          ))}
        </div>

        {/* Linhas fixas: jamais esticam a tabela. */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {projects.length === 0 ? (
            <div className="flex h-10 items-center justify-center border-b border-slate-200 px-2 text-xs text-slate-500">
              Nenhum projeto vinculado a este PMO no ciclo.
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="grid h-9 grid-cols-[92px_104px_minmax(0,1fr)_126px_74px_74px_128px] items-center border-b border-slate-200 last:border-b-0"
              >
                <div className="truncate px-2 text-xs text-slate-500" title={project.chamadoTopDesk || "—"}>
                  {project.chamadoTopDesk || "—"}
                </div>
                <div className="truncate px-2 text-xs text-slate-600" title={project.tipo || "—"}>
                  {project.tipo || "—"}
                </div>
                <div className="min-w-0 px-2">
                  <a
                    href={`#${projectBookmark(project.id)}`}
                    className="block truncate text-xs font-bold text-[#006B4F] hover:underline"
                    title={`Ir para a lâmina de ${project.nome}`}
                  >
                    {project.nome}
                  </a>
                </div>
                <div className="truncate px-2 text-xs text-slate-600" title={project.fase || "—"}>
                  {project.fase || "—"}
                </div>
                <div className="px-2 text-center text-xs tabular-nums text-slate-500">
                  {formatPercent(project.avancoPrevisto)}
                </div>
                <div className="px-2 text-center text-xs font-semibold tabular-nums text-slate-800">
                  {formatPercent(project.avancoReal)}
                </div>
                <div className="flex items-center px-2">
                  <StatusPill project={project} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Slide>
  );
}

/* ------------------------------- lâmina rígida ---------------------------- */

const NO_BREAK: React.CSSProperties = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
};

function Box({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}
      style={NO_BREAK}
    >
      <h3 className="flex h-[22px] shrink-0 items-center gap-1.5 border-b border-slate-200 px-3 text-[9px] font-bold uppercase tracking-[0.08em] text-[#003D2E]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#006B4F]" aria-hidden="true" />
        <span className="truncate">{title}</span>
      </h3>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function ProjectSlide({ project, id }: { project: Project; id: string }) {
  /** Sem duplicatas, sem vazios e no máximo 5 itens. */
  const tasks =
    project.tarefasPriorizadas
      ?.filter(Boolean)
      .map((task) => task.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter(
        (task, index, all) =>
          all.findIndex((candidate) => normalizeKey(candidate) === normalizeKey(task)) === index
      )
      .slice(0, 5) ?? [];

  const real = Math.min(100, Math.max(0, (project.avancoReal ?? 0) * 100));
  const previsto = Math.min(100, Math.max(0, (project.avancoPrevisto ?? 0) * 100));
  const desvio =
    project.avancoReal !== null && project.avancoPrevisto !== null
      ? project.avancoReal - project.avancoPrevisto
      : null;

  const info = [
    { label: "Sponsor", value: project.sponsor || "—" },
    { label: "Líder", value: project.lider || "—" },
    { label: "PMO", value: project.pmo || "—" },
    { label: "Fase", value: project.fase || "—" },
    { label: "Início", value: project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir" },
    { label: "Prev. Término", value: project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir" },
  ];

  return (
    <Slide id={id}>
      {/* Topo — h-24 (96px). */}
      <header
        className="flex h-24 min-h-0 shrink-0 items-start justify-between gap-6 overflow-hidden"
        style={NO_BREAK}
      >
        <div className="min-w-0">
          <h2 className="line-clamp-2 max-h-[72px] text-3xl font-bold leading-tight text-slate-800">
            {project.nome}
          </h2>
          <p className="mt-1 truncate text-xs text-slate-500">
            ID {project.id}
            {project.tipo ? ` · ${project.tipo}` : ""}
          </p>
        </div>
        <StatusPill project={project} large />
      </header>

      {/* Faixa 1 — h-20 (80px). */}
      <div
        className="grid h-20 shrink-0 grid-cols-6 gap-2 overflow-hidden"
        style={NO_BREAK}
      >
        {info.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-col justify-center overflow-hidden rounded-lg bg-slate-50 px-3"
          >
            <p className="truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-800" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Faixa 2 — h-[250px]. */}
      <div
        className="grid h-[250px] min-h-0 shrink-0 grid-cols-2 gap-4 overflow-hidden"
        style={NO_BREAK}
      >
        <div className="grid h-full min-h-0 grid-rows-[110px_110px] content-start gap-[10px]">
          <Box title="Resumo executivo" className="h-[110px]">
            <p className="line-clamp-4 overflow-hidden text-ellipsis px-3 py-2 text-[11.5px] leading-[1.45] text-slate-600">
              {project.resumoExecutivo.trim() || "Sem atualização registrada."}
            </p>
          </Box>
          <Box title="Impedimentos" className="h-[110px]">
            <p className="line-clamp-4 overflow-hidden text-ellipsis px-3 py-2 text-[11.5px] leading-[1.45] text-slate-600">
              {project.impedimentos.trim() || "Nenhum impedimento registrado."}
            </p>
          </Box>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-[10px] overflow-hidden">
          <Box title="Previsto x Executado" className="h-[100px]">
            <div className="flex h-full flex-col justify-center gap-2 overflow-hidden px-3 py-1.5">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#00A67A]"
                  style={{ width: `${real}%` }}
                  aria-hidden="true"
                />
                {project.avancoPrevisto !== null ? (
                  <span
                    className="absolute inset-y-0 w-0.5 bg-[#003D2E]"
                    style={{ left: `calc(${previsto}% - 1px)` }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <p className="truncate text-[10.5px] font-semibold tabular-nums text-slate-700">
                Real: {formatPercent(project.avancoReal)} | Prev: {formatPercent(project.avancoPrevisto)} | Desvio:{" "}
                {desvio === null ? "—" : formatDelta(desvio)}
              </p>
            </div>
          </Box>

          <Box title="Governança / Artefatos" className="h-[120px]">
            <div className="grid h-full grid-cols-2 grid-rows-7 gap-x-3 overflow-hidden px-3 py-1">
              {DOCUMENTS.map((document) => {
                const record = resolveDocument(project, document.aliases);
                const done = record?.status === "SIM";
                const finishedAt = formatDocumentDate(record?.dataFinalizacao);
                return (
                  <div
                    key={document.label}
                    className="flex min-w-0 items-center justify-between gap-1 overflow-hidden"
                    title={
                      finishedAt
                        ? `${document.label} finalizado em ${finishedAt}`
                        : `${document.label}: ${record?.status ?? "A_DEFINIR"}`
                    }
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      <span
                        className={`shrink-0 text-[7px] leading-none ${
                          done ? "text-emerald-500" : "text-red-500"
                        }`}
                        aria-hidden="true"
                      >
                        ●
                      </span>
                      <span className="truncate text-[9px] leading-none text-slate-600">
                        {document.label}
                      </span>
                    </span>
                    {finishedAt ? (
                      <span className="shrink-0 text-[8px] tabular-nums text-slate-400">{finishedAt}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Box>
        </div>
      </div>

      {/* Faixa 3 — h-[200px]; o flex-shrink absorve a diferença de padding. */}
      <Box title="Tarefas críticas" className="h-[200px] min-h-0 shrink overflow-hidden">
        <div className="h-full overflow-hidden px-4 py-2">
          {tasks.length > 0 ? (
            <ol className="space-y-2">
              {tasks.map((task, index) => (
                <li
                  key={`${task}-${index}`}
                  className="flex min-w-0 items-start gap-2 overflow-hidden text-[12px] text-slate-600"
                >
                  <span className="shrink-0 font-mono text-[10px] font-bold leading-[1.6] text-[#006B4F]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A67A]"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-1 min-w-0 truncate leading-[1.6]" title={task}>
                    {task}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12px] text-slate-500">Nenhuma tarefa priorizada registrada.</p>
          )}
        </div>
      </Box>

      {/* Rodapé — h-10 (40px), sem quebra no link. */}
      <footer
        className="flex h-10 shrink-0 items-center justify-between gap-4 overflow-hidden border-t border-slate-200"
        style={NO_BREAK}
      >
        <div className="flex items-center whitespace-nowrap text-xs font-semibold text-[#006B4F]">
          <a
            href={`#${pmoBookmark(project.pmo || "não atribuído")}`}
            className="inline-block whitespace-nowrap text-xs font-semibold text-[#006B4F] hover:underline"
            title={`Ir para o acompanhamento do PMO ${project.pmo}`}
          >
            ← Voltar ao acompanhamento PMO {project.pmo}
          </a>
        </div>
        <span className="min-w-0 truncate text-[10px] text-slate-500">
          Chamado: {project.chamadoTopDesk || "—"}
        </span>
      </footer>
    </Slide>
  );
}

/* --------------------------------- página -------------------------------- */

interface PmoGroup {
  pmo: string;
  projects: Project[];
}

interface PmoSlideData {
  pmo: string;
  projects: Project[];
  part: number;
  parts: number;
  id: string;
}

/**
 * Reúne o CSS efetivamente aplicado na página (Tailwind compilado + estilos
 * próprios). É isso que mantém as cores e o layout corretos no HTML baixado,
 * mesmo sem internet e sem o CDN.
 */
function collectDocumentCss(): string {
  const blocks = new Set<string>();

  document.querySelectorAll("style").forEach((style) => {
    const text = style.textContent?.trim();
    if (text) blocks.add(text);
  });

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      const text = Array.from(rules)
        .map((rule) => rule.cssText)
        .join("\n")
        .trim();
      if (text) blocks.add(text);
    } catch {
      // Folhas externas (ex.: Google Fonts) podem ser protegidas por CORS.
    }
  }

  return Array.from(blocks)
    .join("\n")
    .replace(/<\/style/gi, "<\\/style");
}

export function PresentationView() {
  const storedProjects = usePortfolioStore((state) => state.projects);
  const projects = useMemo(() => normalizeProjects(storedProjects), [storedProjects]);
  const deckRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const estrategicos = projects.filter((project) => tipoKey(project) === "estrategico");
    const taticos = projects.filter((project) => tipoKey(project) === "tatico");
    const planos = projects.filter((project) => tipoKey(project) === "plano");

    // Agrupa por chave normalizada: "João" e "Joao" não geram bookmarks iguais.
    const groupsByKey = new Map<string, PmoGroup>();
    for (const pmo of KNOWN_PMOS) {
      groupsByKey.set(normalizeKey(pmo), { pmo, projects: [] });
    }
    for (const project of projects) {
      const label = pmoLabel(project);
      const key = normalizeKey(label);
      if (!groupsByKey.has(key)) groupsByKey.set(key, { pmo: label, projects: [] });
      groupsByKey.get(key)?.projects.push(project);
    }
    const groups = Array.from(groupsByKey.values());

    const pmoSlides: PmoSlideData[] = groups.flatMap((group) => {
      const chunks = chunkRows(group.projects, PMO_ROWS_PER_SLIDE);
      return chunks.map((chunk, index) => ({
        pmo: group.pmo,
        projects: chunk,
        part: index + 1,
        parts: chunks.length,
        id: index === 0 ? pmoBookmark(group.pmo) : `${pmoBookmark(group.pmo)}-parte-${index + 1}`,
      }));
    });

    return { estrategicos, taticos, planos, pmoSlides };
  }, [projects]);

  const slideCount = 5 + data.pmoSlides.length + projects.length;

  /**
   * Exporta uma cópia estática da apresentação em um único .html.
   * - Tailwind via CDN garante o CSS mesmo sem o site online;
   * - os estilos @media print são embutidos para o Ctrl+P / Salvar PDF;
   * - os links "#projeto-id" e "#pmo-nome" viram bookmarks internos.
   */
  function handleDownloadHtml() {
    const slides = deckRef.current;
    if (!slides) return;

    // Sanitização defensiva: remove scripts/iframes/handlers de qualquer HTML
    // que tenha escapado do React (defense-in-depth contra dados importados).
    const template = document.createElement("template");
    template.innerHTML = Array.from(slides.querySelectorAll(".slide-page"))
      .map((slide) => slide.outerHTML)
      .join("\n");

    template.content.querySelectorAll("script, iframe, object, embed, form, meta, link").forEach((node) => node.remove());
    template.content.querySelectorAll("*").forEach((node) => {
      for (const attribute of Array.from(node.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith("on") || value.startsWith("javascript:")) {
          node.removeAttribute(attribute.name);
        }
      }
    });

    const slidesHtml = template.innerHTML;
    const capturedCss = collectDocumentCss();

    const printStyles = `
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; background: #e2e8f0; }
      body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .deck { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 32px; overflow-x: auto; }
      .slide-page { box-sizing: border-box; }
      @media print {
        @page { size: A4 landscape; margin: 0; }
        html, body { width: 297mm; height: 210mm; background: #ffffff; }
        body, body * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .no-print { display: none !important; }
        .deck { display: block; padding: 0; margin: 0; background: #ffffff; overflow: visible; }
        .slide-page {
          width: 297mm !important;
          height: 210mm !important;
          max-width: 297mm !important;
          max-height: 210mm !important;
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: hidden !important;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .slide-page:last-child { page-break-after: auto; break-after: auto; }
      }
    `;

    const documentHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Apresentação PMO · Unimed Campo Grande</title>
  <meta name="description" content="Relatório executivo do PMO Unimed Campo Grande" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet" />
  <!-- Sem JavaScript de terceiros/CDN: o CSS compilado abaixo é suficiente.
       Isso evita execução remota em um arquivo que contém dados do portfólio. -->
  <style>
    /* CSS capturado da própria aplicação: funciona 100% offline. */
    ${capturedCss}
  </style>
  <style>
    /* Reforço de fontes/cores caso o arquivo seja aberto sem rede. */
    :root {
      --brand-900: #003D2E; --brand-700: #006B4F; --brand-500: #00A67A; --brand-100: #D6F0E6;
      --status-ok: #059669; --status-warn: #D97706; --status-danger: #DC2626;
      --status-muted: #94A3B8; --status-paused: #7C3AED; --status-done: #0891B2;
    }
    html, body { font-family: "Inter", Arial, Helvetica, sans-serif !important; color: #0F172A; }
    h1, h2, h3, .font-display { font-family: "Sora", "Inter", Arial, Helvetica, sans-serif !important; }
    table { border-collapse: collapse; }
    img { max-width: 100%; }
    .bg-\[\#003D2E\] { background-color: #003D2E !important; }
    .bg-\[\#006B4F\] { background-color: #006B4F !important; }
    .bg-\[\#00A67A\] { background-color: #00A67A !important; }
    .bg-\[\#E8F5F1\] { background-color: #E8F5F1 !important; }
    .text-\[\#003D2E\] { color: #003D2E !important; }
    .text-\[\#006B4F\] { color: #006B4F !important; }
    .text-\[\#00A67A\] { color: #00A67A !important; }
    .slide-page { width: 1280px; height: 720px; overflow: hidden; }
    ${printStyles}
  </style>
</head>
<body>
  <div class="no-print" style="position:sticky;top:0;z-index:50;display:flex;justify-content:flex-end;gap:8px;padding:12px 24px;background:#fff;border-bottom:1px solid #e2e8f0">
    <button onclick="window.print()" style="height:36px;padding:0 16px;border:0;border-radius:8px;background:#006B4F;color:#fff;font-size:12px;font-weight:600;cursor:pointer">Imprimir / Salvar PDF</button>
  </div>
  <main class="deck">${slidesHtml}</main>
</body>
</html>`;

    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Apresentacao_PMO_Unimed.html";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <div ref={deckRef} className="print-deck flex min-h-screen flex-col items-center gap-0 overflow-x-auto bg-slate-200 px-8 py-8">
      <div className="no-print mb-6 flex w-[1280px] max-w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="h-8 w-px bg-slate-300" aria-hidden="true" />
          <div>
            <p className="font-display text-sm font-semibold text-slate-800">Apresentação executiva</p>
            <p className="text-[11px] text-slate-500">
              {projects.length} projetos · {slideCount} slides · A4 paisagem
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Visão Geral
          </a>
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#006B4F] bg-white px-3 text-xs font-semibold text-[#006B4F] transition-colors hover:bg-[#E8F5F1]"
          >
            <Download size={14} aria-hidden="true" />
            Baixar Apresentação (HTML)
          </button>
          {/*
            Ao clicar em "Imprimir / Salvar PDF", o navegador gera o PDF a partir
            desta própria página. Como cada link usa <a href="#...">, as lâminas e
            as tabelas de PMO funcionam como bookmarks internos clicáveis no PDF,
            tornando o arquivo 100% standalone (sem depender do site online).
          */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#006B4F] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#003D2E]"
          >
            <Printer size={14} aria-hidden="true" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <CoverSlide projects={projects} id="capa" />

      <PhaseSlide
        title="Projetos por Fase | Total"
        subtitle="Distribuição consolidada do portfólio"
        blockLabel="Portfólio total"
        phases={TOTAL_PHASES}
        resolver={totalPhaseLabel}
        projects={projects}
        id="fases-total"
      />

      <PhaseSlide
        title="Projetos por Fase | Estratégico"
        subtitle="Projetos estratégicos por fase"
        blockLabel="Estratégico"
        phases={CATEGORY_PHASES}
        resolver={categoryPhaseLabel}
        projects={data.estrategicos}
        id="fases-estrategico"
      />

      <PhaseSlide
        title="Projetos por Fase | Tático"
        subtitle="Projetos táticos por fase"
        blockLabel="Tático"
        phases={CATEGORY_PHASES}
        resolver={categoryPhaseLabel}
        projects={data.taticos}
        id="fases-tatico"
      />

      <PhaseSlide
        title="Projetos por Fase | Plano de Ação"
        subtitle="Ações corretivas e projetos em tratamento especial"
        blockLabel="Plano de Ação"
        phases={PLAN_PHASES}
        resolver={planPhaseLabel}
        projects={data.planos}
        id="fases-plano"
      />

      {data.pmoSlides.map((slide) => (
        <PmoSlide
          key={slide.id}
          id={slide.id}
          pmo={slide.pmo}
          projects={slide.projects}
          part={slide.part}
          parts={slide.parts}
        />
      ))}

      {projects.map((project) => (
        <ProjectSlide
          key={`project-${project.id}`}
          id={projectBookmark(project.id)}
          project={project}
        />
      ))}

      <button
        type="button"
        onClick={() => window.print()}
        className="no-print fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#006B4F] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,61,46,0.35)] transition-colors hover:bg-[#003D2E]"
      >
        <Printer size={16} strokeWidth={2.1} aria-hidden="true" />
        Salvar como PDF
      </button>
    </div>
  );
}

export default PresentationView;
