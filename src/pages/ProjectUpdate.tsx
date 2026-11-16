import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  FolderSearch,
  Sparkles,
} from "lucide-react";
import type { Project } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { canEditProject, useAuthStore } from "@/store/useAuthStore";
import {
  extractPromptChanges,
  extractPromptProjectId,
  parseAtualizadorPrompt,
} from "@/lib/parsers/promptParser";
import {
  FIELD_BY_KEY,
  buildProjectPatch,
  createDraft,
  getCurrentValue,
  isSameValue,
  type AppliedChange,
  type ChangeDraft,
  type FieldValue,
} from "@/lib/updateFields";
import { normalizeKey } from "@/lib/normalize";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { Toast, useToastState, type ToastVariant } from "@/components/ui/Toast";
import { UpdateHeader } from "@/components/update/UpdateHeader";
import { PromptInputPanel } from "@/components/update/PromptInputPanel";
import {
  PlannerUploadPanel,
  type PlannerCalculationResult,
} from "@/components/update/PlannerUploadPanel";
import { DetectedChangesForm } from "@/components/update/DetectedChangesForm";
import { DiffTable } from "@/components/update/DiffTable";
import { CopilotPromptBox } from "@/components/update/CopilotPromptBox";

type UpdateMode = "prompt" | "planner";

const TABS = [
  {
    value: "prompt" as const,
    label: "Receber prompt do Atualizador",
    step: "1",
    icon: ClipboardPaste,
  },
  {
    value: "planner" as const,
    label: "Subir Excel do Planner",
    step: "2",
    icon: FileSpreadsheet,
  },
];

/** Converte horas em proporção 0..1 (mesma escala de avancoReal). */
function ratioOrNull(part: number | null | undefined, total: number | null | undefined): number | null {
  if (typeof part !== "number" || typeof total !== "number") return null;
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((part / total) * 1000) / 1000;
}

const INVALID_PROMPT_MESSAGE =
  "Não foi possível extrair alterações. Verifique o formato do prompt colado.";

function draftsFromPairs(
  project: Project,
  pairs: Array<{ key: string; value: FieldValue }>
): ChangeDraft[] {
  const seen = new Set<string>();
  const drafts: ChangeDraft[] = [];

  for (const pair of pairs) {
    const field = FIELD_BY_KEY.get(pair.key);
    if (!field || seen.has(pair.key)) continue;
    seen.add(pair.key);
    drafts.push(createDraft(project, field, pair.value));
  }

  return drafts;
}

function toFieldValue(value: unknown): FieldValue {
  if (typeof value === "string" || typeof value === "number" || value === null) {
    return value;
  }
  return null;
}

/** Converte um Partial<Project> pendente em linhas exibíveis no prompt final. */
function appliedChangesFromPartial(
  project: Project,
  changes: Partial<Project>
): AppliedChange[] {
  const applied: AppliedChange[] = [];

  function add(key: string, rawValue: unknown) {
    const field = FIELD_BY_KEY.get(key);
    if (!field) return;
    applied.push({
      key,
      label: field.label,
      column: field.column,
      kind: field.kind,
      currentValue: getCurrentValue(project, key),
      newValue: toFieldValue(rawValue),
    });
  }

  for (const key of Object.keys(changes)) {
    if (key === "documentos") {
      const documentos = changes.documentos;
      if (!documentos) continue;
      for (const [documentKey, document] of Object.entries(documentos)) {
        if (!document) continue;
        const properties: Array<keyof typeof document> = [
          "status",
          "dataSolicitacao",
          "dataFinalizacao",
        ];
        for (const property of properties) {
          const value = document[property];
          if (value !== undefined) {
            add(`documentos.${documentKey}.${property}`, value);
          }
        }
      }
      continue;
    }

    if (key === "tarefasPriorizadas") {
      changes.tarefasPriorizadas?.forEach((task, index) => {
        if (task !== undefined) add(`tarefasPriorizadas.${index}`, task);
      });
      continue;
    }

    add(key, changes[key as keyof Project]);
  }

  return applied;
}

function reopenDraft(project: Project): ChangeDraft {
  return {
    id: "fase",
    key: "fase",
    label: "Status",
    column: "Fase",
    kind: "text",
    group: "Projeto",
    currentValue: project.fase,
    newValue: "Execução",
    selected: true,
  };
}

export function ProjectUpdate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const project = usePortfolioStore((state) =>
    state.projects.find((item) => item.id === id)
  );
  const applyChanges = usePortfolioStore((state) => state.applyChanges);
  const storeError = usePortfolioStore((state) => state.error);
  const user = useAuthStore((state) => state.user);
  const clearPendingChanges = usePortfolioStore((state) => state.clearPendingChanges);
  const pendingPromptChange = usePortfolioStore((state) =>
    id ? state.pendingPromptChanges[id] ?? null : null
  );
  const { toast, notify, dismiss } = useToastState();

  const requestedTab = searchParams.get("tab");
  const hasPendingQuery = searchParams.get("hasPending") === "true";
  const isManualMode = searchParams.get("mode") === "manual";
  const isReopenReason =
    searchParams.get("reason") === "reabrir" &&
    (!project || normalizeKey(project.fase) === "cancelado");

  const initialMode: UpdateMode =
    requestedTab === "planner" && !hasPendingQuery && !isManualMode
      ? "planner"
      : "prompt";

  const [mode, setMode] = useState<UpdateMode>(initialMode);
  const [drafts, setDrafts] = useState<ChangeDraft[]>(() => {
    if (!project) return [];
    if (isReopenReason) return [reopenDraft(project)];
    return [];
  });
  const [plannerMeta, setPlannerMeta] = useState<PlannerCalculationResult["summary"] | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [applied, setApplied] = useState<AppliedChange[]>(() => {
    if (!project || !hasPendingQuery || !pendingPromptChange) return [];
    return appliedChangesFromPartial(project, pendingPromptChange.changes);
  });
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptWarning, setPromptWarning] = useState<string | null>(null);
  const diffRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDiff) return;
    const timer = window.setTimeout(() => {
      diffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [showDiff]);

  if (!project) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-19rem)] w-full max-w-[720px] items-center justify-center py-8">
        <EmptyState
          icon={FolderSearch}
          title="Projeto não encontrado"
          description="Não há projeto com este ID no portfólio atual. Volte à lista e selecione um projeto válido."
          action={
            <Link
              to="/projetos"
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Voltar aos projetos
            </Link>
          }
          className="w-full bg-surface shadow-sm"
        />
        <Toast toast={toast} onDismiss={dismiss} />
      </div>
    );
  }

  function resetWorkflow() {
    setDrafts([]);
    setShowDiff(false);
    setApplied([]);
    setPromptError(null);
    setPromptWarning(null);
  }

  function handleModeChange(nextMode: UpdateMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetWorkflow();
  }

  function handleAnalyzePrompt(text: string) {
    if (!project) return;

    const parsed = parseAtualizadorPrompt(text);
    const pairs = extractPromptChanges(text);

    if (!parsed || pairs.length === 0) {
      setPromptError(INVALID_PROMPT_MESSAGE);
      setPromptWarning(null);
      setDrafts([]);
      setShowDiff(false);
      setApplied([]);
      notify(
        "error",
        "Nenhuma alteração reconhecida.",
        "Verifique se o prompt segue o formato “Coluna / Novo valor”."
      );
      return;
    }

    const nextDrafts = draftsFromPairs(project, pairs);
    if (nextDrafts.length === 0) {
      setPromptError(INVALID_PROMPT_MESSAGE);
      setDrafts([]);
      return;
    }

    const mentionedId = extractPromptProjectId(text);
    setDrafts(nextDrafts);
    setShowDiff(false);
    setApplied([]);
    setPromptError(null);
    setPromptWarning(
      mentionedId && mentionedId !== project.id
        ? `O prompt menciona o projeto ID ${mentionedId}, mas esta lâmina é do ID ${project.id}. Confirme as alterações antes de aplicar.`
        : null
    );
    notify(
      "info",
      `${nextDrafts.length} ${nextDrafts.length === 1 ? "campo detectado" : "campos detectados"}.`,
      "Revise os valores e selecione o que deve entrar no diff."
    );
  }

  function handleDraftChange(
    draftId: string,
    patch: { newValue?: FieldValue; selected?: boolean }
  ) {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== draftId) return draft;
        const nextValue = patch.newValue !== undefined ? patch.newValue : draft.newValue;
        const wasSame = isSameValue(draft, draft.currentValue, draft.newValue);
        const isNowSame = isSameValue(draft, draft.currentValue, nextValue);
        const selected =
          patch.selected !== undefined
            ? patch.selected
            : wasSame && !isNowSame
              ? true
              : draft.selected;

        return { ...draft, newValue: nextValue, selected };
      })
    );
  }

  function handleAddField(key: string) {
    if (!project) return;
    const field = FIELD_BY_KEY.get(key);
    if (!field || drafts.some((draft) => draft.key === key)) return;
    const current = getCurrentValue(project, key);
    setDrafts((currentDrafts) => [
      ...currentDrafts,
      createDraft(project, field, current, true),
    ]);
  }

  function handlePlannerCalculated(result: PlannerCalculationResult) {
    if (!project) return;
    if (result.changes.every((change) => change.value === null)) {
      notify(
        "error",
        "O bucket selecionado não tem tarefas elegíveis.",
        "Escolha outro bucket ou revise a data de corte."
      );
      return;
    }

    setPlannerMeta(result.summary);
    setDrafts(draftsFromPairs(project, result.changes));
    setShowDiff(true);
    setApplied([]);
    setPromptError(null);
    setPromptWarning(null);
    notify(
      "info",
      "Cálculo concluído.",
      "Revise o diff por horas antes de aplicar no site."
    );
  }

  async function handleApply() {
    if (!project) return;

    if (!canEditProject(user, project)) {
      notify("error", "Perfil somente leitura.", "Você não tem permissão para alterar este projeto.");
      return;
    }

    const selectedDrafts = drafts.filter(
      (draft) => draft.selected && !isSameValue(draft, draft.currentValue, draft.newValue)
    );
    if (selectedDrafts.length === 0) return;

    const patch = buildProjectPatch(project, selectedDrafts);
    const reopenChange = selectedDrafts.find((draft) => draft.key === "fase");
    if (reopenChange && reopenChange.newValue !== null) {
      patch.fase = String(reopenChange.newValue);
      patch.faseOrdem = 5;
    }
    const ok = await applyChanges(project.id, patch, {
      source: mode,
      sourceDetail: isReopenReason ? "Reabertura de projeto cancelado" : null,
      planner:
        mode === "planner" && plannerMeta
          ? {
              bucket: plannerMeta.bucket,
              horasTotal: plannerMeta.horasTotal,
              horasReal: plannerMeta.horasReal,
              horasPrevistas: plannerMeta.horasPrevistas,
              real: ratioOrNull(plannerMeta.horasReal, plannerMeta.horasTotal),
              previsto: ratioOrNull(plannerMeta.horasPrevistas, plannerMeta.horasTotal),
              desvio:
                ratioOrNull(plannerMeta.horasReal, plannerMeta.horasTotal) !== null &&
                ratioOrNull(plannerMeta.horasPrevistas, plannerMeta.horasTotal) !== null
                  ? Math.round(
                      ((ratioOrNull(plannerMeta.horasReal, plannerMeta.horasTotal) as number) -
                        (ratioOrNull(plannerMeta.horasPrevistas, plannerMeta.horasTotal) as number)) *
                        1000
                    ) / 1000
                  : null,
              sourceFile: plannerMeta.planName,
            }
          : undefined,
    });

    if (!ok) {
      notify("error", "Não foi possível aplicar as alterações.", storeError ?? "Tente novamente.");
      return;
    }

    setApplied(
      selectedDrafts.map((draft) => ({
        key: draft.key,
        label: draft.label,
        column: draft.column,
        kind: draft.kind,
        currentValue: draft.currentValue,
        newValue: draft.newValue,
      }))
    );

    setDrafts((current) =>
      current.map((draft) => {
        const wasApplied = selectedDrafts.some((selectedDraft) => selectedDraft.id === draft.id);
        return wasApplied
          ? { ...draft, currentValue: draft.newValue, selected: false }
          : draft;
      })
    );
    setShowDiff(false);
    notify(
      "success",
      `${selectedDrafts.length} campos alterados no preview.`,
      "Gere o prompt para aplicar no Excel."
    );
  }

  function handleDiscard() {
    resetWorkflow();
    notify("info", "Alterações descartadas.", "Nada foi aplicado no site.");
  }

  function handlePromptNotify(
    variant: ToastVariant,
    title: string,
    description?: string
  ) {
    if (!project) return;

    if (
      variant === "success" &&
      (title === "Prompt copiado." || title === "Download iniciado.")
    ) {
      clearPendingChanges(project.id);
      notify("success", "Prompt gerado. Cole no Copilot do Excel.");
      return;
    }

    notify(variant, title, description);
  }

  return (
    <div className="pb-2">
      <UpdateHeader project={project} />

      {!canEditProject(user, project) ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-status-warn/25 bg-status-warn/[0.07] px-3.5 py-3"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-text">
            <strong className="font-semibold">Perfil somente leitura.</strong> Você pode visualizar o
            projeto, mas não aplicar alterações.
          </p>
        </div>
      ) : null}

      {isReopenReason ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-status-warn/25 bg-status-warn/[0.07] px-3.5 py-3"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-text">
            <strong className="font-semibold">Este projeto está Cancelado.</strong> Aplicar
            atualização irá sugerir reativá-lo. Confirme com o sponsor antes.
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <Tabs
          items={TABS}
          value={mode}
          onChange={handleModeChange}
          ariaLabel="Forma de receber a atualização"
        />
      </div>

      {applied.length > 0 ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-status-ok/20 bg-status-ok/[0.055] px-3.5 py-2.5">
            <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-status-ok">
              <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden="true" />
              {applied.length} {applied.length === 1 ? "campo aplicado" : "campos aplicados"} no preview local
            </p>
            <button
              type="button"
              onClick={resetWorkflow}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
            >
              <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
              Iniciar nova atualização
            </button>
          </div>
          <CopilotPromptBox
            project={project}
            changes={applied}
            onBackToProject={() => navigate(`/projetos/${project.id}`)}
            onNotify={handlePromptNotify}
          />
        </div>
      ) : null}

      {applied.length === 0 && mode === "prompt" && !isManualMode && !isReopenReason ? (
        <div className="mt-4">
          <PromptInputPanel
            onAnalyze={handleAnalyzePrompt}
            error={promptError}
            warning={promptWarning}
            hasDrafts={drafts.length > 0}
          />
        </div>
      ) : null}

      {applied.length === 0 && mode === "planner" ? (
        <div className="mt-4">
          <PlannerUploadPanel project={project} onCalculated={handlePlannerCalculated} />
        </div>
      ) : null}

      {mode === "prompt" &&
      (drafts.length > 0 || isManualMode) &&
      !showDiff &&
      applied.length === 0 ? (
        <div className="mt-4">
          <DetectedChangesForm
            drafts={drafts}
            source={mode}
            defaultAddingOpen={isManualMode}
            onChange={handleDraftChange}
            onRemove={(draftId) =>
              setDrafts((current) => current.filter((draft) => draft.id !== draftId))
            }
            onAddField={handleAddField}
            onConfirm={() => setShowDiff(true)}
          />
        </div>
      ) : null}

      {showDiff && applied.length === 0 ? (
        <div ref={diffRef} className="mt-4 scroll-mt-40">
          <DiffTable
            drafts={drafts}
            onToggle={(draftId, selected) =>
              handleDraftChange(draftId, { selected })
            }
            onApply={() => void handleApply()}
            onDiscard={handleDiscard}
          />
        </div>
      ) : null}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
