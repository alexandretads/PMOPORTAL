import type { BinaryStatus, Project, ProjectDocument, StatusKey } from "@/types";
import { formatDateBR } from "@/lib/format";
import { normalizeDate, normalizePercent, normalizeText } from "@/lib/normalize";

export type FieldValue = string | number | null;
export type FieldKind = "percent" | "date" | "text" | "status";
export type FieldGroup = "Projeto" | "Tarefas priorizadas" | "Documentos";

export interface FieldDefinition {
  key: string;
  label: string;
  column: string;
  kind: FieldKind;
  group: FieldGroup;
}

export interface ChangeDraft extends FieldDefinition {
  id: string;
  currentValue: FieldValue;
  newValue: FieldValue;
  selected: boolean;
}

export interface FieldValuePair {
  key: string;
  value: FieldValue;
}

export interface AppliedChange {
  key: string;
  label: string;
  column: string;
  kind: FieldKind;
  currentValue: FieldValue;
  newValue: FieldValue;
}

interface DocumentSpec {
  key: string;
  label: string;
  statusColumn: string;
  requestColumn: string;
  completionColumn: string;
  requestAliases?: string[];
  completionAliases?: string[];
}

export const DOCUMENT_SPECS: DocumentSpec[] = [
  {
    key: "canvas",
    label: "Canvas",
    statusColumn: "Canvas",
    requestColumn: "Data solicitação Canvas",
    completionColumn: "Data Finalizado Canvas",
  },
  {
    key: "eap",
    label: "EAP",
    statusColumn: "EAP",
    requestColumn: "Data solicitação EAP",
    completionColumn: "Data Finalizado EAP",
  },
  {
    key: "esg",
    label: "ESG",
    statusColumn: "ESG",
    requestColumn: "Data solicitação ESG",
    completionColumn: "Data Finalizado ESG",
  },
  {
    key: "rip",
    label: "RIP",
    statusColumn: "RIP",
    requestColumn: "Data solicitação RIP",
    completionColumn: "Data Finalizado RIP",
  },
  {
    key: "compliance",
    label: "Parecer Compliance",
    statusColumn: "Parecer Compliance",
    requestColumn: "Data solicitação Compl.",
    completionColumn: "Data Finalizado Compl.",
    requestAliases: ["Data solicitação Compliance", "Data do solicitação Parecer Compliance"],
    completionAliases: ["Data Finalizado Compliance", "Data Finalizado em Parecer Compliance"],
  },
  {
    key: "pessoas",
    label: "Viabilidade Pessoas",
    statusColumn: "Viabilidade Pessoas",
    requestColumn: "Data solic. Pessoas",
    completionColumn: "Data Final. Pessoas",
    requestAliases: ["Data solicitação Pessoas", "Data do solicitação Viabilidade Pessoas"],
    completionAliases: ["Data Finalizado Pessoas", "Data Finalizado em Viabilidade Pessoas"],
  },
  {
    key: "ti",
    label: "Viabilidade TI",
    statusColumn: "Viabilidade TI",
    requestColumn: "Data solic. TI",
    completionColumn: "Data Final. TI",
    requestAliases: ["Data solicitação TI", "Data do solicitação Viabilidade TI"],
    completionAliases: ["Data Finalizado TI", "Data Finalizado em Viabilidade TI"],
  },
  {
    key: "engenharia",
    label: "Viabilidade Engenharia",
    statusColumn: "Viabilidade Engenharia",
    requestColumn: "Data solic. Eng.",
    completionColumn: "Data Final. Eng.",
    requestAliases: ["Data solicitação Engenharia", "Data do solicitação Viabilidade Engenharia"],
    completionAliases: ["Data Finalizado Engenharia", "Data Finalizado em Viabilidade Engenharia"],
  },
  {
    key: "financeira",
    label: "Viabilidade Financeira",
    statusColumn: "Viabilidade Financeira",
    requestColumn: "Data solic. Financ.",
    completionColumn: "Data Final. Financ.",
    requestAliases: ["Data solicitação Financeira", "Data do solicitação Viabilidade Financeira"],
    completionAliases: ["Data Finalizado Financeira", "Data Finalizado em Viabilidade Financeira"],
  },
  {
    key: "parecerConsolidado",
    label: "Parecer Consolidado",
    statusColumn: "Parecer Consolidado",
    requestColumn: "Data solicitação Parecer Consolidado",
    completionColumn: "Data Finalizado Parecer Consolidado",
  },
  {
    key: "tap",
    label: "TAP",
    statusColumn: "TAP",
    requestColumn: "Data confecção TAP",
    completionColumn: "Data assinatura TAP",
    requestAliases: ["Data solicitação TAP", "Data do solicitação TAP"],
    completionAliases: ["Data Finalizado TAP", "Data Finalizado em TAP"],
  },
  {
    key: "tep",
    label: "TEP",
    statusColumn: "TEP",
    requestColumn: "Data confecção TEP",
    completionColumn: "Data assinatura TEP",
    requestAliases: ["Data solicitação TEP", "Data do solicitação TEP"],
    completionAliases: ["Data Finalizado TEP", "Data Finalizado em TEP"],
  },
  {
    key: "kickoff",
    label: "Kick-off",
    statusColumn: "Kick-off",
    requestColumn: "Data prevista Kick-off",
    completionColumn: "Data realizada Kick-off",
    requestAliases: ["Data solicitação Kick-off", "Data do solicitação Kick-off"],
    completionAliases: ["Data Finalizado Kick-off", "Data Finalizado em Kick-off"],
  },
  {
    key: "planner",
    label: "Planner",
    statusColumn: "Planner",
    requestColumn: "Data solic./criação Planner",
    completionColumn: "Data disponibilização Planner",
    requestAliases: ["Data solicitação Planner", "Data do solicitação Planner"],
    completionAliases: ["Data Finalizado Planner", "Data Finalizado em Planner"],
  },
];

const PRIMARY_FIELDS: FieldDefinition[] = [
  {
    key: "avancoReal",
    label: "Avanço Real %",
    column: "Avanço Real %",
    kind: "percent",
    group: "Projeto",
  },
  {
    key: "avancoPrevisto",
    label: "Avanço previsto",
    column: "Avanço previsto",
    kind: "percent",
    group: "Projeto",
  },
  {
    key: "resumoExecutivo",
    label: "Resumo executivo",
    column: "Resumo executivo",
    kind: "text",
    group: "Projeto",
  },
  {
    key: "impedimentos",
    label: "Impedimentos",
    column: "Impedimentos",
    kind: "text",
    group: "Projeto",
  },
  {
    key: "previsaoGoLive",
    label: "Previsão de go-live",
    column: "Previsão de go-live",
    kind: "date",
    group: "Projeto",
  },
  {
    key: "ultimaAtualizacaoPlanner",
    label: "Data da última atualização do Planner",
    column: "Data da última atualização do Planner",
    kind: "date",
    group: "Projeto",
  },
];

const TASK_FIELDS: FieldDefinition[] = Array.from({ length: 5 }, (_, index) => ({
  key: `tarefasPriorizadas.${index}`,
  label: `Tarefa Priorizada ${index + 1}`,
  column: `Tarefa Priorizada ${index + 1}`,
  kind: "text" as const,
  group: "Tarefas priorizadas" as const,
}));

const DOCUMENT_FIELDS: FieldDefinition[] = DOCUMENT_SPECS.flatMap((document) => [
  {
    key: `documentos.${document.key}.status`,
    label: `${document.label} — Status`,
    column: document.statusColumn,
    kind: "status" as const,
    group: "Documentos" as const,
  },
  {
    key: `documentos.${document.key}.dataSolicitacao`,
    label: `${document.label} — Solicitação`,
    column: document.requestColumn,
    kind: "date" as const,
    group: "Documentos" as const,
  },
  {
    key: `documentos.${document.key}.dataFinalizacao`,
    label: `${document.label} — Finalização`,
    column: document.completionColumn,
    kind: "date" as const,
    group: "Documentos" as const,
  },
]);

export const UPDATABLE_FIELDS: FieldDefinition[] = [
  ...PRIMARY_FIELDS,
  ...TASK_FIELDS,
  ...DOCUMENT_FIELDS,
];

export const FIELD_BY_KEY = new Map(UPDATABLE_FIELDS.map((field) => [field.key, field]));

const FIELD_GROUPS: FieldGroup[] = ["Projeto", "Tarefas priorizadas", "Documentos"];

export function getFieldGroups(): Array<{ group: FieldGroup; fields: FieldDefinition[] }> {
  return FIELD_GROUPS.map((group) => ({
    group,
    fields: UPDATABLE_FIELDS.filter((field) => field.group === group),
  })).filter((entry) => entry.fields.length > 0);
}

export function isStatusKey(value: string): value is StatusKey {
  return (
    value === "no_prazo" ||
    value === "em_atencao" ||
    value === "atrasado" ||
    value === "sem_apuracao" ||
    value === "parado" ||
    value === "encerrado"
  );
}

export function normalizeBinaryValue(value: unknown): BinaryStatus {
  const key = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!key || key === "a definir" || key.includes("pendente")) return "A_DEFINIR";
  if (key === "na" || key === "n/a" || key.includes("se aplica")) return "NA";
  if (key === "sim" || key === "s" || key === "yes" || key.startsWith("sim ")) return "SIM";
  if (key === "nao" || key === "n" || key === "no" || key.startsWith("nao ")) return "NAO";
  return "A_DEFINIR";
}

function documentOf(project: Project, documentKey: string): ProjectDocument {
  return (
    project.documentos[documentKey] ?? {
      status: "A_DEFINIR",
      dataSolicitacao: null,
      dataFinalizacao: null,
    }
  );
}

export function getCurrentValue(project: Project, key: string): FieldValue {
  if (key.startsWith("tarefasPriorizadas.")) {
    const index = Number(key.split(".")[1]);
    return project.tarefasPriorizadas[index] ?? null;
  }

  if (key.startsWith("documentos.")) {
    const [, documentKey, property] = key.split(".");
    const document = documentOf(project, documentKey);
    if (property === "status") return document.status;
    if (property === "dataSolicitacao") return document.dataSolicitacao;
    if (property === "dataFinalizacao") return document.dataFinalizacao;
    return null;
  }

  switch (key) {
    case "avancoReal":
      return project.avancoReal;
    case "avancoPrevisto":
      return project.avancoPrevisto;
    case "resumoExecutivo":
      return project.resumoExecutivo;
    case "impedimentos":
      return project.impedimentos;
    case "previsaoGoLive":
      return project.previsaoGoLive;
    case "ultimaAtualizacaoPlanner":
      return project.ultimaAtualizacaoPlanner;
    default:
      return null;
  }
}

export function formatFieldValue(field: FieldDefinition, value: FieldValue): string {
  if (field.kind === "percent") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return `${(value * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  }

  if (field.kind === "date") {
    return typeof value === "string" && value ? formatDateBR(value) : "—";
  }

  if (field.kind === "status") {
    const status = normalizeBinaryValue(value);
    return status === "NAO" ? "NÃO" : status === "NA" ? "N/A" : status === "A_DEFINIR" ? "A DEFINIR" : "SIM";
  }

  if (value === null || value === undefined) return "—";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || "—";
}

/** Formatação usada nas células do prompt: percentual decimal, data ISO e texto entre aspas. */
export function formatPromptValue(field: FieldDefinition, value: FieldValue): string {
  if (field.kind === "percent") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "(vazio)";
    const rounded = Math.round(value * 1_000_000) / 1_000_000;
    return String(rounded);
  }

  if (field.kind === "date") {
    return typeof value === "string" && value ? value : "(vazio)";
  }

  if (field.kind === "status") {
    const status = normalizeBinaryValue(value);
    return status === "NAO" ? "NÃO" : status === "NA" ? "N/A" : status === "A_DEFINIR" ? "A DEFINIR" : "SIM";
  }

  const text = value === null || value === undefined
    ? ""
    : String(value).replace(/\s*\n+\s*/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

export function toInputValue(field: FieldDefinition, value: FieldValue): string {
  if (field.kind === "percent") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "";
    return String(Math.round(value * 1000) / 10);
  }
  if (field.kind === "status") return normalizeBinaryValue(value);
  if (value === null || value === undefined) return "";
  return String(value);
}

export function fromInputValue(field: FieldDefinition, raw: string): FieldValue {
  if (field.kind === "percent") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    const clamped = Math.min(100, Math.max(0, numeric));
    return Math.round(clamped * 10) / 1000;
  }

  if (field.kind === "date") {
    const normalized = normalizeDate(raw);
    return normalized;
  }

  if (field.kind === "status") return normalizeBinaryValue(raw);

  return raw;
}

export function isSameValue(
  field: FieldDefinition,
  current: FieldValue,
  next: FieldValue
): boolean {
  if (current === null && next === null) return true;
  if (current === null || next === null) return false;

  if (field.kind === "percent") {
    if (typeof current !== "number" || typeof next !== "number") return false;
    return Math.abs(current - next) < 1e-9;
  }

  if (field.kind === "status") {
    return normalizeBinaryValue(current) === normalizeBinaryValue(next);
  }

  return normalizeText(current) === normalizeText(next);
}

export function isPrevistoDivergence(
  field: FieldDefinition,
  current: FieldValue,
  next: FieldValue
): boolean {
  return (
    field.key === "avancoPrevisto" &&
    typeof current === "number" &&
    typeof next === "number" &&
    Math.abs(next - current) > 0.005
  );
}

export function createDraft(
  project: Project,
  field: FieldDefinition,
  newValue: FieldValue,
  selected = !isSameValue(field, getCurrentValue(project, field.key), newValue)
): ChangeDraft {
  return {
    ...field,
    id: field.key,
    currentValue: getCurrentValue(project, field.key),
    newValue,
    selected,
  };
}

export function buildProjectPatch(project: Project, drafts: ChangeDraft[]): Partial<Project> {
  const patch: Partial<Project> = {};
  let documentos: Record<string, ProjectDocument> | null = null;
  let tarefas: string[] | null = null;

  for (const draft of drafts) {
    if (draft.key.startsWith("tarefasPriorizadas.")) {
      const index = Number(draft.key.split(".")[1]);
      tarefas = [...(tarefas ?? project.tarefasPriorizadas)];
      while (tarefas.length <= index) tarefas.push("");
      tarefas[index] = draft.newValue === null ? "" : String(draft.newValue);
      continue;
    }

    if (draft.key.startsWith("documentos.")) {
      const [, documentKey, property] = draft.key.split(".");
      documentos = documentos ?? { ...project.documentos };
      const current = documentoAt(documentos, documentKey);
      const next: ProjectDocument = { ...current };

      if (property === "status") next.status = normalizeBinaryValue(draft.newValue);
      if (property === "dataSolicitacao") {
        next.dataSolicitacao =
          typeof draft.newValue === "string" && draft.newValue ? draft.newValue : null;
      }
      if (property === "dataFinalizacao") {
        next.dataFinalizacao =
          typeof draft.newValue === "string" && draft.newValue ? draft.newValue : null;
      }

      documentos[documentKey] = next;
      continue;
    }

    switch (draft.key) {
      case "avancoReal":
        patch.avancoReal = typeof draft.newValue === "number" ? draft.newValue : null;
        break;
      case "avancoPrevisto":
        patch.avancoPrevisto = typeof draft.newValue === "number" ? draft.newValue : null;
        break;
      case "resumoExecutivo":
        patch.resumoExecutivo = draft.newValue === null ? "" : String(draft.newValue);
        break;
      case "impedimentos":
        patch.impedimentos = draft.newValue === null ? "" : String(draft.newValue);
        break;
      case "previsaoGoLive":
        patch.previsaoGoLive = typeof draft.newValue === "string" && draft.newValue ? draft.newValue : null;
        break;
      case "ultimaAtualizacaoPlanner":
        patch.ultimaAtualizacaoPlanner =
          typeof draft.newValue === "string" && draft.newValue ? draft.newValue : null;
        break;
      default:
        break;
    }
  }

  if (documentos) patch.documentos = documentos;
  if (tarefas) patch.tarefasPriorizadas = tarefas;
  return patch;
}

function documentoAt(
  documentos: Record<string, ProjectDocument>,
  key: string
): ProjectDocument {
  return (
    documentos[key] ?? {
      status: "A_DEFINIR",
      dataSolicitacao: null,
      dataFinalizacao: null,
    }
  );
}

export function fieldValuesToPartial(values: FieldValuePair[]): Partial<Project> {
  const partial: Partial<Project> = {};

  for (const { key, value } of values) {
    if (key.startsWith("tarefasPriorizadas.")) {
      const index = Number(key.split(".")[1]);
      const tarefas = [...(partial.tarefasPriorizadas ?? [])];
      while (tarefas.length <= index) tarefas.push("");
      tarefas[index] = value === null ? "" : String(value);
      partial.tarefasPriorizadas = tarefas;
      continue;
    }

    if (key.startsWith("documentos.")) {
      const [, documentKey, property] = key.split(".");
      const documentos = { ...(partial.documentos ?? {}) };
      const document: ProjectDocument = documentos[documentKey] ?? {
        status: "A_DEFINIR",
        dataSolicitacao: null,
        dataFinalizacao: null,
      };
      if (property === "status") document.status = normalizeBinaryValue(value);
      if (property === "dataSolicitacao") {
        document.dataSolicitacao = typeof value === "string" && value ? value : null;
      }
      if (property === "dataFinalizacao") {
        document.dataFinalizacao = typeof value === "string" && value ? value : null;
      }
      documentos[documentKey] = document;
      partial.documentos = documentos;
      continue;
    }

    switch (key) {
      case "avancoReal":
        partial.avancoReal = typeof value === "number" ? value : null;
        break;
      case "avancoPrevisto":
        partial.avancoPrevisto = typeof value === "number" ? value : null;
        break;
      case "resumoExecutivo":
        partial.resumoExecutivo = value === null ? "" : String(value);
        break;
      case "impedimentos":
        partial.impedimentos = value === null ? "" : String(value);
        break;
      case "previsaoGoLive":
        partial.previsaoGoLive = typeof value === "string" && value ? value : null;
        break;
      case "ultimaAtualizacaoPlanner":
        partial.ultimaAtualizacaoPlanner =
          typeof value === "string" && value ? value : null;
        break;
      default:
        break;
    }
  }

  return partial;
}

/** Validações de percentual reaproveitadas pelo parser e pelo modo Planner. */
export function percentFromPrompt(raw: string): number | null | undefined {
  const clean = raw.trim();
  if (!clean || /^(?:—|-|vazio|\(vazio\)|n\/a|na|a definir)$/i.test(clean)) return null;
  const parsed = normalizePercent(clean);
  return parsed === null ? undefined : parsed;
}
