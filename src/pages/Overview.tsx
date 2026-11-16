import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Download,
  Layers,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  Search,
  Target,
  Upload,
  X,
} from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { filterProjects } from "@/lib/filterProjects";
import { formatDateBR } from "@/lib/format";
import { normalizeKey } from "@/lib/normalize";
import { DEMO_CYCLE } from "@/data/demoSample";
import { exportStatusExcel } from "@/lib/exporters/exportStatusExcel";
import {
  downloadPortfolioSnapshot,
  isPortfolioSnapshot,
} from "@/lib/exporters/exportBackupJson";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { KPICard } from "@/components/ui/KPICard";
import { PortfolioFilterBar } from "@/components/ui/PortfolioFilterBar";
import { PhaseChart } from "@/components/dashboard/PhaseChart";
import { PmoDonut } from "@/components/dashboard/PmoDonut";
import { StatusDistribution } from "@/components/dashboard/StatusDistribution";
import { AttentionList } from "@/components/dashboard/AttentionList";

export function Overview() {
  const projects = usePortfolioStore((state) => state.projects);
  const filters = usePortfolioStore((state) => state.filters);
  const lastStatusUpload = usePortfolioStore((state) => state.lastStatusUpload);
  const setFilter = usePortfolioStore((state) => state.setFilter);
  const isLoading = usePortfolioStore((state) => state.isLoading);
  const exportSnapshot = usePortfolioStore((state) => state.exportSnapshot);
  const importSnapshot = usePortfolioStore((state) => state.importSnapshot);
  const snapshotInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const filtered = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  function handleBackupDownload() {
    try {
      exportStatusExcel(projects);
      pushToast({
        variant: "success",
        title: "Backup gerado.",
        description: `${projects.length} ${
          projects.length === 1 ? "projeto exportado" : "projetos exportados"
        } no formato da planilha original.`,
      });
    } catch {
      pushToast({
        variant: "error",
        title: "Não foi possível gerar o backup.",
        description: "Tente novamente em alguns instantes.",
      });
    }
  }

  /**
   * KPIs derivados da carteira completa. A planilha pode trazer os tipos no
   * plural ("Estratégicos") e sem acento ("Taticos"), então usamos includes
   * em caixa baixa em vez de igualdade exata.
   */
  const totalProjetos = projects.length;
  const normalize = (value: string | null | undefined) => normalizeKey(value ?? "");
  function handleSnapshotDownload() {
    try {
      const snapshot = exportSnapshot();
      const fileName = downloadPortfolioSnapshot(snapshot);
      pushToast({
        variant: "success",
        title: "Snapshot exportado.",
        description: `${fileName} · ${snapshot.projects.length} projetos, ${snapshot.changeLogs.length} logs e ${snapshot.plannerSnapshots.length} snapshots do Planner.`,
      });
    } catch {
      pushToast({ variant: "error", title: "Não foi possível exportar o snapshot." });
    }
  }

  async function handleSnapshotRestore(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      pushToast({ variant: "error", title: "Snapshot muito grande.", description: "O limite é 10 MB." });
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isPortfolioSnapshot(parsed)) {
        throw new Error("Arquivo JSON fora do formato esperado.");
      }
      const ok = await importSnapshot(parsed);
      const currentError = usePortfolioStore.getState().error;
      pushToast({
        variant: ok ? "success" : "error",
        title: ok ? "Snapshot restaurado." : "Falha ao restaurar o snapshot.",
        description: ok
          ? `${parsed.projects.length} projetos e ${parsed.changeLogs.length} registros de histórico.`
          : currentError ?? "Verifique o arquivo e tente novamente.",
      });
    } catch (error) {
      pushToast({
        variant: "error",
        title: "Falha ao restaurar o snapshot.",
        description: error instanceof Error ? error.message : "JSON inválido.",
      });
    }
  }

  const emExecucao = projects.filter((project) =>
    normalize(project.fase).includes("execu")
  ).length;
  const estrategicos = projects.filter((project) =>
    normalize(project.tipo).includes("estrateg")
  ).length;
  const parados = projects.filter((project) =>
    normalize(project.fase).includes("parad")
  ).length;

  const ciclo = lastStatusUpload?.ciclo ?? DEMO_CYCLE;
  const updatedAt = lastStatusUpload?.uploadedAt ?? new Date();
  const executionPercentage =
    totalProjetos > 0 ? Math.round((emExecucao / totalProjetos) * 100) : 0;
  const strategyPercentage =
    totalProjetos > 0 ? Math.round((estrategicos / totalProjetos) * 100) : 0;

  return (
    <div className="min-w-0 overflow-x-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              Painel executivo do PMO
            </p>
          </div>
          <h1 className="mt-2 font-display text-[25px] font-semibold leading-tight tracking-[-0.035em] text-text sm:text-[29px]">
            Visão Geral do Portfólio
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-text2 sm:text-[12px]">
            <span>
              Ciclo:{" "}
              <strong className="font-semibold text-text">{ciclo}</strong>
            </span>
            <span className="text-border" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-text">
                {filtered.length === projects.length
                  ? projects.length
                  : `${filtered.length} de ${projects.length}`}
              </strong>{" "}
              {projects.length === 1 ? "projeto" : "projetos"}
            </span>
            <span className="text-border" aria-hidden="true">
              ·
            </span>
            <span>Atualizado em {formatDateBR(updatedAt)}</span>
            {isLoading ? (
              <>
                <span className="text-border" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-brand-700">
                  <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                  Sincronizando
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            to="/apresentacao"
            className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-2 border-brand-700 bg-surface px-3 text-[11.5px] font-medium text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            title="Gerar apresentação executiva em PDF de todo o portfólio"
            aria-label="Gerar Apresentação do portfólio completo"
          >
            <MonitorPlay size={15} strokeWidth={2} aria-hidden="true" />
            Gerar Apresentação
          </Link>
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleBackupDownload}
            tooltip="Espelha a estrutura da planilha Status dos Projetos Detalhado"
            aria-label="Baixar Backup (.xlsx) de todos os projetos"
            className="h-9 px-3 text-[11.5px]"
          >
            Baixar Backup (.xlsx)
          </Button>
          <Button
            variant="ghost"
            icon={isLoading ? Loader2 : Layers}
            onClick={handleSnapshotDownload}
            tooltip="Snapshot JSON com projetos, histórico e snapshots do Planner"
            aria-label="Baixar snapshot JSON do portfólio"
            className="h-9 px-3 text-[11.5px]"
          >
            Snapshot (.json)
          </Button>
          <button
            type="button"
            onClick={() => snapshotInputRef.current?.click()}
            title="Restaurar snapshot JSON"
            aria-label="Restaurar snapshot JSON"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text2 transition-colors hover:bg-bg hover:text-text"
          >
            <Upload size={14} aria-hidden="true" />
          </button>
          <input
            ref={snapshotInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              void handleSnapshotRestore(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            aria-label="Selecionar snapshot JSON"
          />

          {filters.busca.trim() ? (
            <button
              type="button"
              onClick={() => setFilter("busca", "")}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 text-[10.5px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              title="Limpar busca global"
            >
              <Search size={11} strokeWidth={2.2} aria-hidden="true" />
              <span className="max-w-[130px] truncate">“{filters.busca.trim()}”</span>
              <X size={11} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}

          <div className="hidden items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2 shadow-sm sm:flex">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand-50 text-brand-700"
              aria-hidden="true"
            >
              <CalendarClock size={14} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text2">
                {lastStatusUpload ? "Planilha importada" : "Base demonstrativa"}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-text">
                {lastStatusUpload ? formatDateBR(lastStatusUpload.uploadedAt) : "Amostra local · DEMO"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <PortfolioFilterBar className="mt-5" />

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores do portfólio">
        <KPICard
          label="Total de projetos"
          value={totalProjetos}
          hint="Carteira completa do ciclo"
          icon={Layers}
          accent="brand"
        />
        <KPICard
          label="Em execução"
          value={emExecucao}
          hint={
            totalProjetos === 0
              ? "Nenhum projeto na carteira"
              : `${executionPercentage}% da carteira em execução`
          }
          icon={Play}
          accent="execution"
        />
        <KPICard
          label="Estratégicos"
          value={estrategicos}
          hint={
            totalProjetos === 0
              ? "Nenhum projeto na carteira"
              : `${strategyPercentage}% da carteira é estratégico`
          }
          icon={Target}
          accent="strategy"
        />
        <KPICard
          label="Parados"
          value={parados}
          hint={parados === 0 ? "Nenhum projeto parado na carteira" : "Requerem revisão do comitê"}
          icon={Pause}
          accent="paused"
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Visão por fase e PMO">
        <div className="lg:col-span-2">
          <PhaseChart
            projects={filtered}
            activePhase={filters.fase}
            onSelectPhase={(phase) => setFilter("fase", phase)}
          />
        </div>
        <PmoDonut projects={filtered} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Status e atenção">
        <div className="lg:col-span-2">
          <StatusDistribution
            projects={filtered}
            activeStatus={filters.status}
            onSelectStatus={(status) => setFilter("status", status)}
          />
        </div>
        <AttentionList projects={filtered} />
      </section>
    </div>
  );
}
