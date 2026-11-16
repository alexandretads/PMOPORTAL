import { create } from "zustand";
import type {
  ChangeLogRecord,
  ChangeSource,
  PendingPromptChange,
  PlannerPlan,
  PlannerSnapshot,
  PortfolioFilters,
  PortfolioSnapshot,
  Project,
  StatusUploadMeta,
} from "@/types";
import { cloneDemoProjects } from "@/data/demoSample";
import { projectHistory, type HistoricalFieldChange } from "@/lib/calc/timeMachine";
import {
  isPlausibleProjectRecord,
  normalizeProjectCollection,
  normalizeProjectRecord,
  normalizeSnapshotPayload,
} from "@/lib/projectSchema";
import { getPortfolioRepository } from "@/lib/data/portfolioRepository";
import { parseStatusExcel, extractCicloFromFileName } from "@/lib/parsers/statusParser";
import { parsePlannerExcel } from "@/lib/parsers/plannerParser";

export type UpdateMode = "prompt" | "planner";

export interface ApplyChangesMeta {
  source: ChangeSource;
  sourceDetail?: string | null;
  planner?: {
    bucket: string | null;
    horasTotal: number | null;
    horasReal: number | null;
    horasPrevistas: number | null;
    real: number | null;
    previsto: number | null;
    desvio: number | null;
    sourceFile: string | null;
  };
}

export interface ImportResult {
  ok: boolean;
  count: number;
  error: string | null;
  ciclo?: string;
  fileName?: string;
}

interface HistoryEntry {
  id?: string;
  data: string;
  descricao: string;
  origem: string;
  source?: ChangeSource;
  changedAt?: string;
  changes?: HistoricalFieldChange[];
}

/** Limites defensivos contra arquivos maliciosos ou gigantes. */
const MAX_EXCEL_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_SNAPSHOT_PROJECTS = 5000;

export interface PortfolioState {
  projects: Project[];
  changeLogs: ChangeLogRecord[];
  plannerSnapshots: PlannerSnapshot[];
  lastStatusUpload: StatusUploadMeta | null;
  dataCorte: Date | null;
  filters: PortfolioFilters;
  pendingPromptChanges: Record<string, PendingPromptChange>;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  persistenceProvider: "local" | "supabase";

  /** Importações: única porta de entrada de Excel na aplicação. */
  importStatusFile: (file: File) => Promise<ImportResult>;
  importPlannerFile: (file: File) => Promise<{ ok: boolean; plan: PlannerPlan | null; error: string | null }>;

  /** Leituras. */
  getProject: (projectId: string) => Project | null;
  getPendingChanges: (projectId: string) => PendingPromptChange | null;
  exportSnapshot: () => PortfolioSnapshot;

  /** Escritas. */
  loadStatusProjects: (projects: Project[], meta: StatusUploadMeta) => Promise<boolean>;
  applyChanges: (projectId: string, changes: Partial<Project>, meta: ApplyChangesMeta) => Promise<boolean>;
  importSnapshot: (snapshot: PortfolioSnapshot) => Promise<boolean>;
  setFilter: <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) => void;
  clearFilters: () => void;
  resetDemo: () => Promise<boolean>;
  setPendingChanges: (entry: PendingPromptChange) => void;
  clearPendingChanges: (projectId: string) => void;
  clearError: () => void;
}

const INITIAL_FILTERS: PortfolioFilters = {
  tipo: null,
  fase: null,
  status: null,
  pmo: null,
  busca: "",
};

const NON_COLUMN_FIELDS = new Set(["faseOrdem"]);

function cloneProject(project: Project): Project {
  return {
    ...project,
    tarefasPriorizadas: [...(project.tarefasPriorizadas ?? [])],
    documentos: Object.fromEntries(
      Object.entries(project.documentos ?? {}).map(([key, document]) => [key, { ...document }])
    ),
  };
}

function readHistory(project: Project): HistoryEntry[] {
  const candidate = (project as Project & { historico?: unknown }).historico;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter(
    (entry): entry is HistoryEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as HistoryEntry).data === "string" &&
      typeof (entry as HistoryEntry).descricao === "string"
  );
}

function fieldChanges(project: Project, changes: Partial<Project>): HistoricalFieldChange[] {
  const current = project as unknown as Record<string, unknown>;
  const diffs: HistoricalFieldChange[] = [];
  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    diffs.push({
      field,
      oldValue: structuredCloneSafe(current[field] ?? null),
      newValue: structuredCloneSafe(value),
    });
  }
  return diffs;
}

function structuredCloneSafe<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  }
}

function mergeDocuments(
  current: Project["documentos"],
  incoming: Project["documentos"] | undefined
): Project["documentos"] {
  if (!incoming) return current ?? {};
  const merged: Project["documentos"] = { ...(current ?? {}) };
  for (const [key, document] of Object.entries(incoming)) {
    merged[key] = {
      ...(merged[key] ?? { status: "A_DEFINIR", dataSolicitacao: null, dataFinalizacao: null }),
      ...document,
    };
  }
  return merged;
}

/** Normaliza o histórico dos projetos na coleção canônica change_logs. */
function buildChangeLogs(projects: Project[]): ChangeLogRecord[] {
  const logs: ChangeLogRecord[] = [];

  for (const project of projects) {
    projectHistory(project).forEach((entry, index) => {
      const rawChanges = Array.isArray((entry as { changes?: unknown }).changes)
        ? ((entry as { changes: HistoricalChangeRecordInput[] }).changes)
        : [];
      logs.push({
        id: typeof entry.id === "string" && entry.id ? entry.id : `${project.id}-${index}`,
        projectId: project.id,
        projectName: project.nome,
        description: entry.descricao ?? "",
        source: entry.source ?? "seed",
        sourceDetail: null,
        changedAt: entry.changedAt ?? entry.data,
        year: entry.year,
        month: entry.month,
        week: entry.week,
        weekStart: entry.weekStart,
        weekEnd: entry.weekEnd,
        changes: rawChanges.map((change) => ({
          field: String(change.field ?? ""),
          oldValue: change.oldValue ?? null,
          newValue: change.newValue,
        })),
      });
    });
  }

  return logs.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

interface HistoricalChangeRecordInput {
  field?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
}

export function countRealChanges(changes: Partial<Project>): number {
  return Object.entries(changes).reduce((total, [key, value]) => {
    if (value === undefined || NON_COLUMN_FIELDS.has(key)) return total;
    if (key === "documentos") {
      const documentos = value as Project["documentos"];
      return (
        total +
        Object.values(documentos ?? {}).reduce((sum, document) => {
          if (!document) return sum;
          return sum + Object.values(document).filter((field) => field !== undefined).length;
        }, 0)
      );
    }
    return total + 1;
  }, 0);
}

const repository = getPortfolioRepository();

const INITIAL_PROJECTS = cloneDemoProjects();

/** Contador de operações assíncronas: isLoading só cai quando todas terminam. */
let pendingOperations = 0;

export const usePortfolioStore = create<PortfolioState>((set, get) => {
  const beginOperation = () => {
    pendingOperations += 1;
    set({ isLoading: true, error: null });
  };
  const endOperation = () => {
    pendingOperations = Math.max(0, pendingOperations - 1);
    set({ isLoading: pendingOperations > 0 });
  };

  return {
  projects: INITIAL_PROJECTS,
  changeLogs: buildChangeLogs(INITIAL_PROJECTS),
  plannerSnapshots: [],
  lastStatusUpload: null,
  dataCorte: null,
  filters: { ...INITIAL_FILTERS },
  pendingPromptChanges: {},
  isLoading: false,
  error: null,
  lastSyncedAt: null,
  persistenceProvider: repository.provider,

  importStatusFile: async (file) => {
    beginOperation();
    try {
      if (file.size > MAX_EXCEL_BYTES) {
        throw new Error("Arquivo muito grande. O limite é 20 MB.");
      }
      const projects = await parseStatusExcel(file);
      if (projects.length === 0) {
        throw new Error(
          'Nenhum projeto válido encontrado. Confira a coluna "ID do Projeto".'
        );
      }
      const ciclo = extractCicloFromFileName(file.name);
      const ok = await get().loadStatusProjects(projects, {
        fileName: file.name,
        ciclo,
        uploadedAt: new Date(),
      });
      return { ok, count: projects.length, error: get().error, ciclo, fileName: file.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao ler a planilha de status.";
      set({ error: message });
      return { ok: false, count: 0, error: message };
    } finally {
      endOperation();
    }
  },

  importPlannerFile: async (file) => {
    beginOperation();
    try {
      if (file.size > MAX_EXCEL_BYTES) {
        throw new Error("Arquivo muito grande. O limite é 20 MB.");
      }
      const plan = await parsePlannerExcel(file);
      if (!Array.isArray(plan.tarefas) || plan.tarefas.length === 0) {
        throw new Error('O arquivo não possui tarefas. Verifique a coluna "Número de tarefa".');
      }
      return { ok: true, plan, error: null };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'O arquivo não parece ser um export válido do Planner.';
      set({ error: message });
      return { ok: false, plan: null, error: message };
    } finally {
      endOperation();
    }
  },

  getProject: (projectId) => get().projects.find((project) => project.id === projectId) ?? null,

  getPendingChanges: (projectId) => get().pendingPromptChanges[projectId] ?? null,

  exportSnapshot: () => {
    const state = get();
    const snapshot: PortfolioSnapshot = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      projects: state.projects.map(cloneProject),
      changeLogs: state.changeLogs.map((log) => ({ ...log, changes: [...log.changes] })),
      plannerSnapshots: state.plannerSnapshots.map((item) => ({ ...item })),
    };
    // Persistência best-effort: não bloqueia o download se o backend falhar.
    void repository.saveSnapshot(snapshot).catch(() => undefined);
    return snapshot;
  },

  loadStatusProjects: async (projects, meta) => {
    beginOperation();
    try {
      if (!Array.isArray(projects)) {
        throw new Error("Lista de projetos inválida.");
      }
      const malformed = projects.filter((project) => !isPlausibleProjectRecord(project)).length;
      if (malformed > 0) {
        throw new Error(
          `Planilha/API inválida: ${malformed} projeto(s) com tipos de campo incorretos. Nada foi carregado.`
        );
      }
      const collection = normalizeProjectCollection(projects);
      if (collection.projects.length === 0) {
        throw new Error("A planilha não retornou projetos válidos.");
      }
      if (collection.invalid > 0 || collection.duplicates > 0) {
        throw new Error(
          `Planilha inválida: ${collection.invalid} projeto(s) sem ID/campos e ${collection.duplicates} ID(s) duplicado(s).`
        );
      }
      const normalized = collection.projects.map(cloneProject);
      const changeLogs = buildChangeLogs(normalized);

      await repository.saveProjects(normalized);
      await repository.saveChangeLogs(changeLogs);

      set({
        projects: normalized,
        changeLogs,
        lastStatusUpload: meta,
        dataCorte: meta.uploadedAt,
        filters: { ...INITIAL_FILTERS },
        pendingPromptChanges: {},
        lastSyncedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar o portfólio.";
      set({ error: message });
      return false;
    } finally {
      endOperation();
    }
  },

  applyChanges: async (projectId, changes, meta) => {
    beginOperation();
    try {
      const state = get();
      const target = state.projects.find((project) => project.id === projectId);
      if (!target) throw new Error("Projeto não encontrado para atualização.");

      const appliedAt = new Date().toISOString();
      // id e histórico são imutáveis via patch; somente campos de negócio entram.
      const { id: _ignoredId, historico: _ignoredHistory, ...safeChanges } =
        changes as Partial<Project> & { historico?: unknown };
      const updated = state.projects.map((project) =>
        project.id === projectId
          ? normalizeProjectRecord(
              Object.assign(
              {
                ...project,
                ...safeChanges,
                tarefasPriorizadas: safeChanges.tarefasPriorizadas
                  ? [...safeChanges.tarefasPriorizadas]
                  : project.tarefasPriorizadas,
                documentos: mergeDocuments(project.documentos, safeChanges.documentos),
              },
              {
                historico: [
                  {
                    id:
                      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `log-${projectId}-${appliedAt}`,
                    data: appliedAt,
                    descricao: `Atualização via ${meta.source} — ${Object.keys(safeChanges).length} campos`,
                    origem: meta.source === "planner" ? "Planner" : "Prompt Atualizador",
                    source: meta.source,
                    changedAt: appliedAt,
                    changes: fieldChanges(project, safeChanges),
                  },
                  ...readHistory(project),
                ],
              }
            )
            ) ?? project
          : project
      );

      const changeLogs = buildChangeLogs(updated);
      const plannerSnapshots = [...state.plannerSnapshots];

      if (meta.source === "planner") {
        plannerSnapshots.unshift({
          id: `planner-${projectId}-${appliedAt}`,
          projectId,
          createdAt: appliedAt,
          bucket: meta.planner?.bucket ?? null,
          horasTotal: meta.planner?.horasTotal ?? null,
          horasReal: meta.planner?.horasReal ?? null,
          horasPrevistas: meta.planner?.horasPrevistas ?? null,
          real: meta.planner?.real ?? null,
          previsto: meta.planner?.previsto ?? null,
          desvio: meta.planner?.desvio ?? null,
          sourceFile: meta.planner?.sourceFile ?? null,
        });
      }

      await repository.saveProjects(updated);
      await repository.saveChangeLogs(changeLogs);
      await repository.savePlannerSnapshots(plannerSnapshots);

      const pending: PendingPromptChange = {
        projectId,
        changes: structuredCloneSafe(changes),
        appliedAt,
        source: meta.source,
        sourceDetail: meta.sourceDetail ?? null,
      };

      set({
        projects: updated,
        changeLogs,
        plannerSnapshots,
        pendingPromptChanges: { ...state.pendingPromptChanges, [projectId]: pending },
        lastSyncedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao aplicar alterações.";
      set({ error: message });
      return false;
    } finally {
      endOperation();
    }
  },

  importSnapshot: async (snapshot) => {
    beginOperation();
    try {
      const normalized = normalizeSnapshotPayload(snapshot);
      if (!normalized) {
        throw new Error("Snapshot inválido: lista de projetos ausente ou fora do formato.");
      }
      if (normalized.snapshot.projects.length > MAX_SNAPSHOT_PROJECTS) {
        throw new Error(`Snapshot muito grande. O limite é ${MAX_SNAPSHOT_PROJECTS} projetos.`);
      }
      if (
        normalized.invalidProjects > 0 ||
        normalized.duplicateProjects > 0 ||
        normalized.invalidLogs > 0 ||
        normalized.invalidPlannerSnapshots > 0
      ) {
        throw new Error(
          `Snapshot inválido: ${normalized.invalidProjects} projeto(s) malformado(s), ` +
            `${normalized.duplicateProjects} ID(s) duplicado(s), ${normalized.invalidLogs} log(s) e ` +
            `${normalized.invalidPlannerSnapshots} snapshot(s) do Planner inválidos. Nada foi importado.`
        );
      }

      const nextProjects = normalized.snapshot.projects.map(cloneProject);
      const changeLogs = normalized.snapshot.changeLogs;
      const plannerSnapshots = normalized.snapshot.plannerSnapshots;

      await repository.saveProjects(nextProjects);
      await repository.saveChangeLogs(changeLogs);
      await repository.savePlannerSnapshots(plannerSnapshots);

      set({
        projects: nextProjects,
        changeLogs,
        plannerSnapshots,
        lastStatusUpload: null,
        dataCorte: null,
        filters: { ...INITIAL_FILTERS },
        pendingPromptChanges: {},
        lastSyncedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao importar o snapshot.",
      });
      return false;
    } finally {
      endOperation();
    }
  },

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () => set({ filters: { ...INITIAL_FILTERS } }),

  resetDemo: async () => {
    beginOperation();
    try {
      const projects = cloneDemoProjects();
      const changeLogs = buildChangeLogs(projects);
      await repository.saveProjects(projects);
      await repository.saveChangeLogs(changeLogs);
      await repository.savePlannerSnapshots([]);
      set({
        projects,
        changeLogs,
        plannerSnapshots: [],
        lastStatusUpload: null,
        dataCorte: null,
        filters: { ...INITIAL_FILTERS },
        pendingPromptChanges: {},
        lastSyncedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Falha ao restaurar a demonstração.",
      });
      return false;
    } finally {
      endOperation();
    }
  },

  setPendingChanges: (entry) =>
    set((state) => ({
      pendingPromptChanges: { ...state.pendingPromptChanges, [entry.projectId]: entry },
    })),

  clearPendingChanges: (projectId) =>
    set((state) => {
      const next = { ...state.pendingPromptChanges };
      delete next[projectId];
      return { pendingPromptChanges: next };
    }),

  clearError: () => set({ error: null }),
  };
});
