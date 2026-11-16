import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  History,
  Pencil,
  Plus,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ProjectTimeline } from "@/components/project/ProjectTimeline";
import { ProjectHistory } from "@/components/project/ProjectHistory";
import { ProjectEditModal } from "@/components/project/ProjectEditModal";
import { CreateProjectModal } from "@/components/project/CreateProjectModal";
import { gerarExcelDaSemana } from "@/lib/calc/exportTimeMachine";
import { formatWeekLabel, listWeeksForMonth } from "@/lib/calc/weekCalendar";
import { cn } from "@/utils/cn";

/* =========================================================================
   PÁGINA TEMPORÁRIA DE PREVIEW — remover após a migração.
   Não usa store, Supabase ou tipos globais. Todos os dados são fictícios.
   ========================================================================= */

const mockProject = {
  id: "1",
  nome: "Cadeia de Suprimentos",
  sponsor: "Filipe Vieira",
  lider: "Willian Maciel Martinez",
  pmo: "Alexandre",
  chamadoTopDesk: "CH2603-14238",
  tipo: "Taticos",
  fase: "Execução",
  status: "Em atenção",
  timeline: [
    { fase: "Ideia", data: "2026-04-10T10:00:00Z", usuario: "Alexandre" },
    { fase: "Análise de Viabilidade", data: "2026-05-15T10:00:00Z", usuario: "Alexandre" },
    { fase: "Aprovação", data: "2026-06-20T10:00:00Z", usuario: "Alexandre" },
    { fase: "Planejamento", data: "2026-07-10T10:00:00Z", usuario: "Alexandre" },
    { fase: "Execução", data: "2026-08-01T10:00:00Z", usuario: "Alexandre" },
  ],
};

const mockLogs: any[] = [
  {
    id: "log-1",
    projectId: "1",
    changed_at: "2026-11-12T17:20:00-04:00",
    source: "prompt",
    description: "Atualização via prompt do Atualizador — 2 campos",
    changes: [
      {
        field: "resumo_executivo",
        old_value: null,
        new_value:
          "Avanço real de 73,8%, frente a 76,7% previsto. Pendências em rastreabilidade, Multiempresa e Data Matrix.",
      },
      { field: "impedimentos", old_value: "Pendências em rastreabilidade.", new_value: null },
    ],
  },
  {
    id: "log-2",
    projectId: "1",
    changed_at: "2026-11-11T09:15:00-04:00",
    source: "planner",
    description: "Cálculo por horas no bucket Cadeia de Suprimentos",
    changes: [
      { field: "avanco_real", old_value: 0.68, new_value: 0.738 },
      { field: "documentos.eap.status", old_value: "NAO", new_value: "SIM" },
    ],
  },
  {
    id: "log-3",
    projectId: "1",
    changed_at: "2026-11-05T14:30:00-04:00",
    source: "planner",
    description: "Avanço previsto ajustado após revisão de cronograma",
    changes: [
      { field: "avanco_previsto", old_value: 0.72, new_value: 0.767 },
      {
        field: "tarefas_priorizadas",
        old_value: ["Rastreabilidade", "Multiempresa"],
        new_value: ["Rastreabilidade", "Multiempresa", "Data Matrix"],
      },
    ],
  },
  {
    id: "log-4",
    projectId: "1",
    changed_at: "2026-10-28T15:10:00-04:00",
    source: "prompt",
    description: "Encerramento do TEP",
    changes: [
      { field: "status", old_value: "em_atencao", new_value: "encerrado" },
      { field: "previsao_go_live", old_value: null, new_value: "2026-12-15" },
    ],
  },
];

const WEEKS = listWeeksForMonth(2026, 11);

interface NewProjectRecord {
  id: string;
  nome: string;
  tipo: string;
  sponsor: string;
  lider: string;
  pmo: string;
  fase: string;
}

const INITIAL_CREATED: NewProjectRecord[] = [
  {
    id: "preview-1",
    nome: "Projeto criado no preview",
    tipo: "Estratégico",
    sponsor: "Filipe Vieira",
    lider: "Willian Maciel Martinez",
    pmo: "Alexandre",
    fase: "Ideia",
  },
];

function Section({
  letter,
  title,
  description,
  icon: Icon,
  children,
  aside,
}: {
  letter: string;
  title: string;
  description: string;
  icon: typeof Route;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`section-${letter}`}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-display text-[12px] font-bold text-white">
            {letter}
          </span>
          <div className="min-w-0">
            <h2
              id={`section-${letter}`}
              className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-[-0.02em] text-slate-900"
            >
              <Icon size={15} strokeWidth={1.9} className="text-slate-400" aria-hidden="true" />
              {title}
            </h2>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Toolbar({
  title,
  onEdit,
  onCreate,
  summary,
}: {
  title: string;
  onEdit: () => void;
  onCreate: () => void;
  summary: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusPill label="Em atenção" tone="warn" />
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            #{mockProject.id}
          </span>
        </div>
        <p className="mt-1 truncate font-display text-[14px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{summary}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 sm:inline">
          {mockProject.tipo} · {mockProject.fase}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Pencil size={12} aria-hidden="true" />
          Editar projeto
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#006B4F] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#003D2E]"
        >
          <Plus size={12} aria-hidden="true" />
          Criar projeto
        </button>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "warn" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]",
        tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", tone === "warn" ? "bg-amber-500" : "bg-emerald-500")}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function PreviewComponentes() {
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editedProject, setEditedProject] = useState<Record<string, any> | null>(null);
  const [createdProjects, setCreatedProjects] = useState<NewProjectRecord[]>(INITIAL_CREATED);
  const [selectedWeek, setSelectedWeek] = useState<number>(WEEKS[1]?.week ?? 1);
  const [exportState, setExportState] = useState<{ tone: "ok" | "error"; message: string } | null>(
    null
  );

  const selectedWeekInfo = WEEKS.find((week) => week.week === selectedWeek) ?? WEEKS[0];

  function handleEditSave(data: Record<string, any>) {
    setEditedProject(data);
  }

  function handleCreateSave(data: {
    nome: string;
    tipo: string;
    sponsor: string;
    lider: string;
    pmo: string;
  }) {
    setCreatedProjects((current) => [
      {
        ...data,
        id: `preview-${current.length + 1}`,
        fase: "Ideia",
      },
      ...current,
    ]);
  }

  function handleExport() {
    if (!selectedWeekInfo) {
      setExportState({ tone: "error", message: "Selecione uma semana válida." });
      return;
    }
    try {
      gerarExcelDaSemana(
        [mockProject, ...createdProjects],
        mockLogs,
        selectedWeekInfo.year,
        selectedWeekInfo.month,
        selectedWeekInfo.week
      );
      setExportState({
        tone: "ok",
        message: `Download iniciado: semana ${selectedWeekInfo.week} (${selectedWeekInfo.weekStart} a ${selectedWeekInfo.weekEnd}) com ${1 + createdProjects.length} projetos.`,
      });
    } catch (error) {
      setExportState({
        tone: "error",
        message: error instanceof Error ? error.message : "Falha ao gerar o Excel.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                <ArrowLeft size={12} aria-hidden="true" />
                Voltar ao portal
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-700">
                  <Sparkles size={10} aria-hidden="true" />
                  Preview temporário
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[9.5px] text-slate-500">
                  /preview-componentes
                </span>
              </div>
              <h1 className="mt-3 font-display text-[26px] font-bold leading-tight tracking-[-0.03em] text-slate-900">
                Componentes de gestão de portfólio
              </h1>
              <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-slate-500">
                Demonstração visual dos cinco componentes isolados, com dados fictícios. Nenhuma
                informação é enviada ao banco ou ao store do portal.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-500">
              <Trash2 size={11} aria-hidden="true" />
              Página descartável — remover após a migração
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 sm:px-6">
        {/* A — Linha do tempo */}
        <Section
          letter="A"
          title="Linha do tempo"
          description="Stepper de fases com ProjectTimeline — verde para fases registradas, azul para a fase atual e cinza para futuras."
          icon={Route}
          aside={<span className="font-mono text-[10px] text-slate-400">ProjectTimeline</span>}
        >
          <div className="mb-4">
            <Toolbar
              title={mockProject.nome}
              summary={`${mockProject.sponsor} · ${mockProject.chamadoTopDesk} · PMO ${mockProject.pmo}`}
              onEdit={() => setEditOpen(true)}
              onCreate={() => setCreateOpen(true)}
            />
          </div>
          <ProjectTimeline
            timeline={mockProject.timeline}
            currentFase={mockProject.fase}
            className="border-slate-200 shadow-none"
          />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: "Verde", value: "Fase registrada no timeline", dot: "bg-emerald-500" },
              { label: "Azul", value: "Fase atual do projeto", dot: "bg-sky-600" },
              { label: "Cinza", value: "Fase ainda futura", dot: "bg-slate-300" },
            ].map((legend) => (
              <div
                key={legend.label}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", legend.dot)} aria-hidden="true" />
                <span className="text-[10px] font-semibold text-slate-700">{legend.label}</span>
                <span className="truncate text-[10px] text-slate-500">{legend.value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* B — Histórico */}
        <Section
          letter="B"
          title="Histórico de alterações"
          description="Feed agrupado por mês e semana com ProjectHistory. Mostra o valor anterior e o novo para cada campo."
          icon={History}
          aside={<span className="font-mono text-[10px] text-slate-400">ProjectHistory</span>}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] text-slate-500">
              <Clock3 size={11} aria-hidden="true" />
              4 registros fictícios, distribuídos em 2 meses/semanas.
            </p>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[9px] text-slate-400">
              {mockLogs.length} logs
            </span>
          </div>
          <ProjectHistory logs={mockLogs} />
        </Section>

        {/* C — Modais */}
        <Section
          letter="C"
          title="Editar e criar projeto"
          description="ProjectEditModal e CreateProjectModal abertos por botão. O resultado de onSave aparece abaixo — nada é persistido."
          icon={Pencil}
          aside={<span className="font-mono text-[10px] text-slate-400">ProjectEditModal · CreateProjectModal</span>}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <Pencil size={14} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[13px] font-semibold text-slate-900">
                    Editar projeto existente
                  </h3>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
                    {mockProject.nome} · {mockProject.chamadoTopDesk}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Pencil size={12} aria-hidden="true" />
                Abrir modal de edição
              </button>
              {editedProject ? (
                <div className="mt-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    <CheckCircle2 size={10} aria-hidden="true" />
                    Último onSave
                  </p>
                  <pre className="max-h-40 overflow-auto rounded border border-slate-200 bg-white p-2.5 text-[9.5px] leading-relaxed text-slate-700">
                    {JSON.stringify(editedProject, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-slate-400">Nenhuma edição enviada ainda.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Plus size={14} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[13px] font-semibold text-slate-900">
                    Criar novo projeto
                  </h3>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
                    O projeto entra no topo da lista abaixo ao confirmar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Plus size={12} aria-hidden="true" />
                Abrir modal de criação
              </button>
              <div className="mt-3 space-y-1.5">
                <p className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <CheckCircle2 size={10} aria-hidden="true" />
                  Criados no preview ({createdProjects.length})
                </p>
                <ul className="max-h-40 space-y-1 overflow-auto">
                  {createdProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2.5 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[10.5px] font-medium text-slate-700">
                        {project.nome}
                      </span>
                      <span className="shrink-0 text-[9px] text-slate-400">{project.tipo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* D — Exportação */}
        <Section
          letter="D"
          title="Excel da semana"
          description="gerarExcelDaSemana reconstrói o estado do portfólio no fim da semana selecionada por rollback dos logs futuros."
          icon={FileSpreadsheet}
          aside={<span className="font-mono text-[10px] text-slate-400">exportTimeMachine</span>}
        >
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="preview-week"
                className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-500"
              >
                Semana de referência
              </label>
              <select
                id="preview-week"
                value={selectedWeek}
                onChange={(event) => {
                  setSelectedWeek(Number(event.target.value));
                  setExportState(null);
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[12px] text-slate-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              >
                {WEEKS.map((week) => (
                  <option key={week.week} value={week.week}>
                    {formatWeekLabel(week)} — {week.weekStart} a {week.weekEnd}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#006B4F] px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#003D2E]"
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              Baixar Excel da semana
            </button>
          </div>

          {exportState ? (
            <p
              role="status"
              className={cn(
                "mt-3 rounded-md border px-3 py-2 text-[10.5px] leading-relaxed",
                exportState.tone === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              )}
            >
              {exportState.message}
            </p>
          ) : (
            <p className="mt-3 text-[10px] text-slate-400">
              A exportação é 100% local. Nenhum arquivo é enviado a servidores.
            </p>
          )}
        </Section>

        <footer className="pb-4 text-center text-[10px] text-slate-400">
          Preview interno · dados fictícios · nenhum vínculo com usePortfolioStore ou Supabase
        </footer>
      </main>

      <ProjectEditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        project={mockProject}
        onSave={handleEditSave}
      />

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreateSave}
      />
    </div>
  );
}

export default PreviewComponentes;
