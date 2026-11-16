import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  FileDown,
  FileText,
  History,
  Info,
  MonitorPlay,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Project } from "@/types";
import { usePortfolioStore, countRealChanges } from "@/store/usePortfolioStore";
import { canEditProject, useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, type DropdownMenuItem } from "@/components/ui/DropdownMenu";

interface ActionBarProps {
  project: Project;
  historicalView?: boolean;
}

export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasContent(project: Project): boolean {
  return Boolean(
    (project.resumoExecutivo && project.resumoExecutivo.trim().length > 0) ||
      (project.impedimentos && project.impedimentos.trim().length > 0) ||
      (project.tarefasPriorizadas && project.tarefasPriorizadas.some((task) => task && task.trim())) ||
      (project.documentos &&
        Object.values(project.documentos).some(
          (document) => document.status !== "A_DEFINIR" || document.dataFinalizacao
        ))
  );
}

function openExternal(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

export function ActionBar({ project, historicalView = false }: ActionBarProps) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const canEdit = canEditProject(user, project);
  const pendingPromptChanges = usePortfolioStore(
    (state) => state.pendingPromptChanges
  );
  const pending = pendingPromptChanges[project.id] ?? null;
  const pendingCount = pending ? countRealChanges(pending.changes) : 0;

  const [highlightPending, setHighlightPending] = useState(pendingCount > 0);
  const barRef = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(64);

  const isCancelado = project.fase === "Cancelado";
  const hasPlanner = isValidUrl(project.linkPlanner);
  const plannerUrl = hasPlanner ? project.linkPlanner : null;
  const defaultTab = hasPlanner ? "planner" : "prompt";
  const canExport = hasContent(project);

  useEffect(() => {
    setHighlightPending(pendingCount > 0);
    if (pendingCount <= 0) return;
    const timer = window.setTimeout(() => setHighlightPending(false), 2000);
    return () => window.clearTimeout(timer);
  }, [pendingCount, project.id]);

  const updateOffset = useCallback(() => {
    const main = barRef.current?.closest("main");
    const topbar = document.querySelector("header");
    const sibling = main?.previousElementSibling ?? null;
    const topbarHeight = topbar?.getBoundingClientRect().height ?? 64;
    const bannerHeight =
      sibling instanceof HTMLElement && sibling.tagName !== "HEADER"
        ? sibling.getBoundingClientRect().height
        : 0;
    const periodSelector = main?.querySelector<HTMLElement>("[data-period-selector]");
    const periodSelectorHeight = periodSelector?.getBoundingClientRect().height ?? 0;

    setStickyTop(Math.round(topbarHeight + bannerHeight + periodSelectorHeight));
  }, []);

  useEffect(() => {
    updateOffset();

    const main = barRef.current?.closest("main");
    const sibling = main?.previousElementSibling;
    const topbar = document.querySelector("header");
    const periodSelector = main?.querySelector<HTMLElement>("[data-period-selector]");
    const observer = new ResizeObserver(updateOffset);

    if (sibling instanceof HTMLElement) observer.observe(sibling);
    if (topbar instanceof HTMLElement) observer.observe(topbar);
    if (periodSelector) observer.observe(periodSelector);
    window.addEventListener("resize", updateOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, [updateOffset]);

  async function copyProjectLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ variant: "success", title: "Link copiado." });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      pushToast({
        variant: copied ? "success" : "error",
        title: copied ? "Link copiado." : "Não foi possível copiar o link.",
        description: copied ? undefined : "Copie manualmente pela barra de endereço.",
      });
    }
  }

  const menuItems: DropdownMenuItem[] = [
    {
      id: "copy-link",
      label: "Copiar link do projeto",
      icon: Copy,
      onSelect: () => void copyProjectLink(),
    },
    {
      id: "history",
      label: "Ir para histórico",
      icon: History,
      onSelect: () =>
        document
          .getElementById("history-card")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      id: "manual",
      label: "Editar campos manualmente",
      icon: PencilLine,
      onSelect: () => navigate(`/projetos/${project.id}/atualizar?tab=prompt&mode=manual`),
    },
    {
      id: "presentation",
      label: "Gerar Apresentação (PDF)",
      icon: MonitorPlay,
      onSelect: () => navigate(`/export/apresentacao?id=${encodeURIComponent(project.id)}`),
    },
  ];

  return (
    <div
      ref={barRef}
      style={{ top: stickyTop }}
      className="sticky z-10 mt-5 rounded-md border border-border bg-surface/95 px-3 py-2.5 shadow-md backdrop-blur-md sm:px-4"
    >
      {!canEdit ? (
        <div
          role="note"
          className="mb-2 flex items-start gap-1.5 rounded-sm bg-status-warn/[0.07] px-3 py-1.5 text-[11px] leading-relaxed text-text2"
        >
          <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <p>
            Seu perfil é <strong className="font-semibold text-text">somente leitura</strong>. As ações
            de atualização estão desabilitadas.
          </p>
        </div>
      ) : null}
      {historicalView ? (
        <div
          role="note"
          className="mb-2 flex items-start gap-1.5 rounded-sm bg-slate-50 px-3 py-1.5 text-[11px] leading-relaxed text-text2"
        >
          <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Você está visualizando uma semana passada. Os botões agem sobre o estado{" "}
            <strong className="font-semibold text-text">ATUAL</strong> do projeto.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
        <div className="hidden items-center gap-2 pr-1 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-text2">
            Ações do projeto
          </span>
        </div>

        <div className="flex w-full flex-col gap-2 md:ml-auto md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
          {isCancelado ? (
            <Button
              variant="secondary"
              icon={RotateCcw}
              disabled={!canEdit}
              fullWidth
              className="md:w-auto"
              onClick={() =>
                navigate(`/projetos/${project.id}/atualizar?tab=prompt&reason=reabrir`)
              }
              aria-label="Reabrir projeto"
            >
              Reabrir projeto <span aria-hidden="true">▸</span>
            </Button>
          ) : hasPlanner ? (
            <Button
              variant="primary"
              icon={RefreshCw}
              disabled={!canEdit}
              tooltip={!canEdit ? "Somente leitura para o seu perfil" : undefined}
              fullWidth
              className="md:w-auto"
              onClick={() =>
                navigate(`/projetos/${project.id}/atualizar?tab=${defaultTab}`)
              }
              aria-label="Atualizar status do projeto"
            >
              Atualizar Status <span aria-hidden="true">▸</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={FileText}
              disabled={!canEdit}
              fullWidth
              className="md:w-auto"
              tooltip="Este projeto não possui Planner cadastrado. Use o modo Prompt do Atualizador."
              onClick={() =>
                navigate(`/projetos/${project.id}/atualizar?tab=prompt`)
              }
              aria-label="Atualizar via prompt do Atualizador"
            >
              Atualizar via Prompt <span aria-hidden="true">▸</span>
            </Button>
          )}

          {pendingCount > 0 ? (
            <Button
              variant="secondary"
              icon={Sparkles}
              disabled={!canEdit}
              highlight={highlightPending}
              fullWidth
              className="md:w-auto"
              onClick={() =>
                navigate(
                  `/projetos/${project.id}/atualizar?tab=prompt&hasPending=true`
                )
              }
              aria-label={`Gerar prompt do Copilot com ${pendingCount} alterações pendentes`}
            >
              Gerar Prompt Copilot ({pendingCount})
            </Button>
          ) : null}

          {plannerUrl ? (
            <Button
              variant="ghost"
              external
              fullWidth
              className="md:w-auto"
              onClick={() => openExternal(plannerUrl)}
              title="Abrir o Planner do projeto em uma nova aba"
              aria-label="Ver no Planner"
            >
              Ver no Planner
            </Button>
          ) : null}

          {canExport ? (
            <Button
              variant="ghost"
              icon={FileDown}
              fullWidth
              className="md:w-auto"
              onClick={() => console.log("Export PDF — implementação futura")}
              title="Exportação será habilitada na próxima iteração"
              aria-label="Exportar PDF"
            >
              Exportar PDF
            </Button>
          ) : null}

          <Button
            variant="secondary"
            icon={MonitorPlay}
            fullWidth
            className="md:w-auto"
            onClick={() =>
              navigate(`/export/apresentacao?id=${encodeURIComponent(project.id)}`)
            }
            aria-label={`Gerar apresentação em PDF do projeto ${project.nome}`}
            title="Gerar apresentação executiva em PDF deste projeto"
          >
            Gerar Apresentação (PDF)
          </Button>

          <DropdownMenu
            items={menuItems}
            label="Mais ações do projeto"
            className="w-full md:w-auto"
            fullWidth
          />
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {pendingCount > 0
          ? `${pendingCount} alterações aguardando o prompt do Copilot.`
          : "Nenhuma alteração pendente."}
      </span>
    </div>
  );
}
