import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FolderSearch } from "lucide-react";
import type { Project } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  entryTimestamp,
  nearestWeekWithUpdate,
  projectHistory,
  projectSnapshotAt,
  weekInfoForSelection,
  type TemporalHistoryEntry,
  type TimeSelection,
} from "@/lib/calc/timeMachine";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { PeriodSelector } from "@/components/project/PeriodSelector";
import { HistoricalBanner } from "@/components/project/HistoricalBanner";
import { ActionBar } from "@/components/project/ActionBar";
import { InfoChipsRow } from "@/components/project/InfoChipsRow";
import { SummaryCard } from "@/components/project/SummaryCard";
import { ProgressCard } from "@/components/project/ProgressCard";
import { ImpedimentsCard } from "@/components/project/ImpedimentsCard";
import { PriorityTasksCard } from "@/components/project/PriorityTasksCard";
import { GovernanceCard } from "@/components/project/GovernanceCard";
import { HistoryCard } from "@/components/project/HistoryCard";

/**
 * Blindagem da lâmina: dados ausentes/nulos em updates, imports ou snapshots
 * antigos não podem derrubar os cards. Preserva propriedades extras (historico).
 */
function sanitizeProject(project: Project): Project {
  const asText = (value: unknown): string => (typeof value === "string" ? value : "");
  const asPercent = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : null;

  const documents: Project["documentos"] = {};
  if (typeof project.documentos === "object" && project.documentos !== null) {
    for (const [key, document] of Object.entries(project.documentos)) {
      const status = document?.status;
      documents[key] = {
        status:
          status === "SIM" || status === "NAO" || status === "NA" || status === "A_DEFINIR"
            ? status
            : "A_DEFINIR",
        dataSolicitacao: typeof document?.dataSolicitacao === "string" ? document.dataSolicitacao : null,
        dataFinalizacao: typeof document?.dataFinalizacao === "string" ? document.dataFinalizacao : null,
      };
    }
  }

  return {
    ...project,
    id: asText(project.id),
    ata: asText(project.ata),
    tipo: asText(project.tipo),
    fase: asText(project.fase),
    faseOrdem: typeof project.faseOrdem === "number" ? project.faseOrdem : 0,
    nome: asText(project.nome),
    sponsor: asText(project.sponsor),
    lider: asText(project.lider),
    pmo: asText(project.pmo),
    emailLider: asText(project.emailLider),
    avancoPrevisto: asPercent(project.avancoPrevisto),
    avancoReal: asPercent(project.avancoReal),
    status: project.status ?? "sem_apuracao",
    resumoExecutivo: asText(project.resumoExecutivo),
    impedimentos: asText(project.impedimentos),
    // O modelo prevê até 5 tarefas críticas; dados maiores não podem esticar a tela.
    tarefasPriorizadas: Array.isArray(project.tarefasPriorizadas)
      ? project.tarefasPriorizadas
          .filter((task): task is string => typeof task === "string")
          .slice(0, 5)
      : [],
    previsaoGoLive: typeof project.previsaoGoLive === "string" ? project.previsaoGoLive : null,
    chamadoTopDesk: asText(project.chamadoTopDesk),
    linkPlanner: typeof project.linkPlanner === "string" ? project.linkPlanner : null,
    ultimaAtualizacaoPlanner:
      typeof project.ultimaAtualizacaoPlanner === "string" ? project.ultimaAtualizacaoPlanner : null,
    documentos: documents,
  };
}

const backButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-sm bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-800";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = usePortfolioStore((state) => {
    const list = Array.isArray(state.projects) ? state.projects : [];
    return list.find((item) => item?.id === id);
  });
  const safeProject = useMemo(() => (project ? sanitizeProject(project) : null), [project]);
  const [view, setView] = useState<TimeSelection | "current">("current");

  useEffect(() => {
    setView("current");
  }, [id]);

  const selection = view === "current" ? null : view;

  const weekInfo = useMemo(
    () => (selection ? weekInfoForSelection(selection) : null),
    [selection]
  );

  /**
   * Semanas futuras não têm alterações posteriores para desfazer, portanto o
   * próprio snapshot já retorna o estado atual, sem lógica especial.
   */
  const displayedProject = useMemo(() => {
    if (!safeProject) return null;
    if (!selection || !weekInfo) return safeProject;
    try {
      return sanitizeProject(projectSnapshotAt(safeProject, weekInfo.weekEnd));
    } catch {
      // Snapshot corrompido nunca derruba a lâmina: cai no estado atual.
      return safeProject;
    }
  }, [safeProject, selection, weekInfo]);

  const lastUpdateInWeek = useMemo<TemporalHistoryEntry | null>(() => {
    if (!project || !selection) return null;
    return (
      projectHistory(project)
        .filter(
          (entry) =>
            entry.year === selection.year &&
            entry.month === selection.month &&
            entry.week === selection.week
        )
        .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))[0] ?? null
    );
  }, [project, selection]);

  const nearestWeek = useMemo<TimeSelection | null>(() => {
    if (!project || !selection || lastUpdateInWeek) return null;
    return nearestWeekWithUpdate(
      project,
      selection.year,
      selection.month,
      selection.week
    );
  }, [project, selection, lastUpdateInWeek]);

  if (!project || !safeProject || !displayedProject) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-19rem)] w-full max-w-[720px] items-center justify-center py-8">
        <EmptyState
          icon={FolderSearch}
          title="Projeto não encontrado"
          description="O projeto solicitado não está disponível neste ciclo. Ele pode ter sido removido da planilha ou o identificador está incorreto."
          action={
            <Link to="/projetos" className={backButtonClassName}>
              <ArrowLeft size={14} strokeWidth={2.1} aria-hidden="true" />
              Voltar aos projetos
            </Link>
          }
          className="w-full bg-surface shadow-sm"
        />
      </div>
    );
  }

  const historicalView = Boolean(selection);
  const bannerView: TimeSelection | "current" = view;

  return (
    <div className="pb-2">
      <ProjectHeader project={displayedProject} />

      <PeriodSelector project={safeProject} value={view} onChange={setView} />

      <HistoricalBanner
        project={safeProject}
        view={bannerView}
        lastUpdateInWeek={lastUpdateInWeek}
        nearestWeek={nearestWeek}
        onJumpToNearest={() => {
          if (nearestWeek) setView(nearestWeek);
        }}
        onResetToCurrent={() => setView("current")}
      />

      <ActionBar project={displayedProject} historicalView={historicalView} />
      <InfoChipsRow project={displayedProject} />

      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <SummaryCard project={displayedProject} className="lg:col-span-2" />
        <ProgressCard project={displayedProject} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        <ImpedimentsCard project={displayedProject} />
        <PriorityTasksCard project={displayedProject} />
      </div>

      <GovernanceCard project={displayedProject} className="mt-4" />
      <HistoryCard project={project} className="mt-4" />
    </div>
  );
}
