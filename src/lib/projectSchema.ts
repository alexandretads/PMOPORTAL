import type {
  BinaryStatus,
  ChangeLogRecord,
  ChangeSource,
  PlannerSnapshot,
  PortfolioSnapshot,
  Project,
  ProjectDocument,
  StatusKey,
} from "@/types";
import { projectHistory, isSafeFieldPath, type HistoricalFieldChange } from "@/lib/calc/timeMachine";

const STATUS_KEYS: StatusKey[] = [
  "no_prazo",
  "em_atencao",
  "atrasado",
  "sem_apuracao",
  "parado",
  "encerrado",
];

const BINARY_STATUSES: BinaryStatus[] = ["SIM", "NAO", "NA", "A_DEFINIR"];
const CHANGE_SOURCES: ChangeSource[] = ["seed", "prompt", "planner"];

/** Texto seguro para qualquer valor vindo de Excel, JSON ou API. */
export function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const clean = value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    return clean || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "SIM" : "NÃO";
  return fallback;
}

export function asPercent(value: unknown): number | null {
  let numeric: number | null = null;
  if (typeof value === "number") numeric = value;
  else if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace("%", "").replace(",", ".").trim());
    numeric = Number.isFinite(parsed) ? parsed : null;
  }
  if (numeric === null || !Number.isFinite(numeric)) return null;
  if (numeric < 0 || numeric > 1) return null;
  return Math.round(numeric * 1_000_000) / 1_000_000;
}

export function asDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export function asUrlOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function asDocument(value: unknown): ProjectDocument {
  const record = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const status = BINARY_STATUSES.includes(record.status as BinaryStatus)
    ? (record.status as BinaryStatus)
    : "A_DEFINIR";
  return {
    status,
    dataSolicitacao: asDateString(record.dataSolicitacao),
    dataFinalizacao: asDateString(record.dataFinalizacao),
  };
}

function asDocuments(value: unknown): Record<string, ProjectDocument> {
  if (typeof value !== "object" || value === null) return {};
  const documents: Record<string, ProjectDocument> = {};
  for (const [key, document] of Object.entries(value)) {
    if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    documents[key] = asDocument(document);
  }
  return documents;
}

/** Normaliza histórico aceitando apenas campos e valores seguros. */
export function asHistory(value: unknown): Array<Record<string, unknown> & { changes: HistoricalFieldChange[] }> {
  return projectHistory({ historico: value } as unknown as Project).map((entry) => ({
    ...entry,
    changes: (entry.changes ?? []).filter((change) => isSafeFieldPath(change.field)),
  })) as Array<Record<string, unknown> & { changes: HistoricalFieldChange[] }>;
}

/**
 * Converte um registro arbitrário em Project válido — ou null se não houver
 * identidade mínima. Nunca lança exceção e nunca preserva chaves perigosas.
 */
export function normalizeProjectRecord(value: unknown, index = 0): (Project & { historico?: unknown[] }) | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const id = asText(record.id);
  if (!id) return null;

  const faseOrdemRaw = Number(record.faseOrdem);
  const faseOrdem = Number.isFinite(faseOrdemRaw) ? faseOrdemRaw : 0;
  const status = STATUS_KEYS.includes(record.status as StatusKey)
    ? (record.status as StatusKey)
    : "sem_apuracao";
  const tasks = Array.isArray(record.tarefasPriorizadas)
    ? record.tarefasPriorizadas.map((task) => asText(task)).filter(Boolean)
    : [];
  const history = asHistory(record.historico);
  const hasHistory = Array.isArray(record.historico) && history.length > 0;

  return {
    id,
    ata: asText(record.ata),
    tipo: asText(record.tipo),
    fase: asText(record.fase),
    faseOrdem,
    nome: asText(record.nome, `Projeto ${id || index + 1}`),
    sponsor: asText(record.sponsor),
    lider: asText(record.lider),
    pmo: asText(record.pmo),
    emailLider: asText(record.emailLider),
    avancoPrevisto: asPercent(record.avancoPrevisto),
    avancoReal: asPercent(record.avancoReal),
    status,
    resumoExecutivo: asText(record.resumoExecutivo),
    impedimentos: asText(record.impedimentos),
    tarefasPriorizadas: tasks,
    previsaoGoLive: asDateString(record.previsaoGoLive),
    chamadoTopDesk: asText(record.chamadoTopDesk),
    linkPlanner: asUrlOrNull(record.linkPlanner),
    ultimaAtualizacaoPlanner: asDateString(record.ultimaAtualizacaoPlanner),
    dataUltimaReuniao: asDateString(record.dataUltimaReuniao),
    dataProximaReuniao: asDateString(record.dataProximaReuniao),
    documentos: asDocuments(record.documentos),
    ...(hasHistory ? { historico: history } : {}),
  } as Project & { historico?: unknown[] };
}

export interface NormalizedCollection {
  projects: Array<Project & { historico?: unknown[] }>;
  invalid: number;
  duplicates: number;
}

/**
 * Normaliza uma coleção. Em modo estrito, qualquer item/duplicidade inválida
 * rejeita o lote inteiro (evita importações parciais silenciosas).
 */
export function normalizeProjectCollection(value: unknown): NormalizedCollection {
  if (!Array.isArray(value)) return { projects: [], invalid: 1, duplicates: 0 };
  const seen = new Set<string>();
  const projects: Array<Project & { historico?: unknown[] }> = [];
  let invalid = 0;
  let duplicates = 0;
  value.forEach((item, index) => {
    const project = normalizeProjectRecord(item, index);
    if (!project) {
      invalid += 1;
      return;
    }
    if (seen.has(project.id)) {
      duplicates += 1;
      return;
    }
    seen.add(project.id);
    projects.push(project);
  });
  return { projects, invalid, duplicates };
}

export function normalizeChangeLogRecord(value: unknown, index = 0): ChangeLogRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const projectId = asText(record.projectId);
  const changedAt = asText(record.changedAt);
  if (!projectId || !changedAt) return null;
  const year = Number(record.year);
  const month = Number(record.month);
  const week = Number(record.week);
  const changes = Array.isArray(record.changes)
    ? record.changes
        .filter(
          (change): change is Record<string, unknown> =>
            typeof change === "object" && change !== null
        )
        .filter((change) => isSafeFieldPath(change.field))
        .map((change) => ({
          field: change.field as string,
          oldValue: change.oldValue ?? null,
          newValue: change.newValue,
        }))
    : [];
  return {
    id: asText(record.id, `log-${index}`),
    projectId,
    projectName: asText(record.projectName),
    description: asText(record.description),
    source: CHANGE_SOURCES.includes(record.source as ChangeSource)
      ? (record.source as ChangeSource)
      : "seed",
    sourceDetail: typeof record.sourceDetail === "string" ? record.sourceDetail : null,
    changedAt,
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) ? month : 0,
    week: Number.isFinite(week) ? week : 0,
    weekStart: asText(record.weekStart),
    weekEnd: asText(record.weekEnd),
    changes,
  };
}

export function normalizePlannerSnapshot(value: unknown, index = 0): PlannerSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const projectId = asText(record.projectId);
  if (!projectId) return null;
  const numberOrNull = (input: unknown): number | null => {
    const numeric = Number(input);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return {
    id: asText(record.id, `planner-${index}`),
    projectId,
    createdAt: asText(record.createdAt),
    bucket: asText(record.bucket) || null,
    horasTotal: numberOrNull(record.horasTotal),
    horasReal: numberOrNull(record.horasReal),
    horasPrevistas: numberOrNull(record.horasPrevistas),
    real: numberOrNull(record.real),
    previsto: numberOrNull(record.previsto),
    desvio: numberOrNull(record.desvio),
    sourceFile: asText(record.sourceFile) || null,
  };
}

/**
 * Validação estrita de forma para snapshots importados. Diferente da
 * normalização de UI, aqui tipos claramente errados são rejeitados em vez de
 * convertidos silenciosamente — evita importar dados corrompidos.
 */
export function isPlausibleProjectRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) return false;

  const optionalStringFields = [
    "ata",
    "tipo",
    "fase",
    "nome",
    "sponsor",
    "lider",
    "pmo",
    "emailLider",
    "resumoExecutivo",
    "impedimentos",
    "chamadoTopDesk",
  ];
  for (const field of optionalStringFields) {
    const current = record[field];
    if (current !== undefined && current !== null && typeof current !== "string") return false;
  }

  if (
    record.documentos !== undefined &&
    record.documentos !== null &&
    (typeof record.documentos !== "object" || Array.isArray(record.documentos))
  ) {
    return false;
  }

  if (
    record.tarefasPriorizadas !== undefined &&
    record.tarefasPriorizadas !== null &&
    (!Array.isArray(record.tarefasPriorizadas) ||
      record.tarefasPriorizadas.some((task) => typeof task !== "string"))
  ) {
    return false;
  }

  const optionalPercentFields = ["avancoPrevisto", "avancoReal"];
  for (const field of optionalPercentFields) {
    const current = record[field];
    if (current !== undefined && current !== null && (typeof current !== "number" || !Number.isFinite(current))) {
      return false;
    }
  }

  if (record.historico !== undefined && record.historico !== null && !Array.isArray(record.historico)) {
    return false;
  }

  return true;
}

export interface NormalizedSnapshot {
  snapshot: PortfolioSnapshot;
  invalidProjects: number;
  duplicateProjects: number;
  invalidLogs: number;
  invalidPlannerSnapshots: number;
}

export function normalizeSnapshotPayload(value: unknown): NormalizedSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.projects)) return null;

  let invalidProjects = 0;
  for (const project of record.projects) {
    if (!isPlausibleProjectRecord(project)) invalidProjects += 1;
  }

  const collection = normalizeProjectCollection(record.projects);
  if (collection.projects.length === 0) return null;

  const logs: ChangeLogRecord[] = [];
  let invalidLogs = 0;
  if (Array.isArray(record.changeLogs)) {
    record.changeLogs.forEach((item, index) => {
      const log = normalizeChangeLogRecord(item, index);
      if (log) logs.push(log);
      else invalidLogs += 1;
    });
  }

  const planner: PlannerSnapshot[] = [];
  let invalidPlannerSnapshots = 0;
  if (Array.isArray(record.plannerSnapshots)) {
    record.plannerSnapshots.forEach((item, index) => {
      const snapshot = normalizePlannerSnapshot(item, index);
      if (snapshot) planner.push(snapshot);
      else invalidPlannerSnapshots += 1;
    });
  }

  return {
    snapshot: {
      schemaVersion: Number(record.schemaVersion) || 1,
      exportedAt: asText(record.exportedAt, new Date().toISOString()),
      projects: collection.projects as Project[],
      changeLogs: logs,
      plannerSnapshots: planner,
    },
    invalidProjects: invalidProjects + collection.invalid,
    duplicateProjects: collection.duplicates,
    invalidLogs,
    invalidPlannerSnapshots,
  };
}
