import * as XLSX from "xlsx";
import { getWeekForDate, listWeeksForMonth } from "@/lib/calc/weekCalendar";
import { DOCUMENT_COLUMNS } from "@/lib/documentColumns";
import {
  STATUS_BACKUP_HEADERS,
  exportDate,
  exportPhase,
} from "@/lib/exporters/exportStatusExcel";

/**
 * Exportação Excel da máquina do tempo — função pura.
 *
 * Não acessa store, Supabase ou qualquer API. Recebe `projects` e `logs` por
 * parâmetro e dispara o download localmente.
 *
 * Algoritmo (rollback):
 * 1. calcula o fim da semana selecionada (sexta 23:59, fuso local);
 * 2. para cada projeto, ordena os logs do mais recente para o mais antigo;
 * 3. desfaz cada log posterior à data de corte, devolvendo `old_value`;
 * 4. o resultado é o estado cumulativo do projeto no fim daquela semana.
 *
 * Se não houver log na semana, o rollback naturalmente devolve o estado do
 * último log anterior (ou o estado atual, quando não há logs).
 *
 * Premissas para uma reconstrução fiel:
 * - `logs` é append-only e representa o portfólio inteiro;
 * - cada log traz `projectId`/`project_id` (ou a coleção tem um único projeto);
 * - cada alteração traz o valor anterior (`old_value`, `oldValue`, `previous`
 *   ou um objeto `before`). Logs somente com `new_value` não podem ser desfeitos
 *   e são ignorados no rollback;
 * - sem qualquer log, não é possível inferir o passado: exporta o estado atual.
 */

type AnyRecord = Record<string, any>;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Campos aceitos no rollback (camelCase e snake_case do Supabase). */
const FIELD_ALIASES: Record<string, string> = {
  ata: "ata",
  tipo: "tipo",
  tipo_de_projeto: "tipo",
  fase: "fase",
  fase_ordem: "faseOrdem",
  faseOrdem: "faseOrdem",
  nome: "nome",
  nome_do_projeto: "nome",
  sponsor: "sponsor",
  lider: "lider",
  pmo: "pmo",
  email_lider: "emailLider",
  emailLider: "emailLider",
  avanco_previsto: "avancoPrevisto",
  avancoPrevisto: "avancoPrevisto",
  avanco_real: "avancoReal",
  avancoReal: "avancoReal",
  status: "status",
  resumo_executivo: "resumoExecutivo",
  resumoExecutivo: "resumoExecutivo",
  impedimentos: "impedimentos",
  tarefas_priorizadas: "tarefasPriorizadas",
  tarefasPriorizadas: "tarefasPriorizadas",
  previsao_go_live: "previsaoGoLive",
  previsaoGoLive: "previsaoGoLive",
  previsao_de_go_live: "previsaoGoLive",
  chamado_topdesk: "chamadoTopDesk",
  chamado_top_desk: "chamadoTopDesk",
  chamadoTopDesk: "chamadoTopDesk",
  link_planner: "linkPlanner",
  linkPlanner: "linkPlanner",
  ultima_atualizacao_planner: "ultimaAtualizacaoPlanner",
  ultimaAtualizacaoPlanner: "ultimaAtualizacaoPlanner",
  data_ultima_reuniao: "dataUltimaReuniao",
  dataUltimaReuniao: "dataUltimaReuniao",
  data_proxima_reuniao: "dataProximaReuniao",
  dataProximaReuniao: "dataProximaReuniao",
  documentos: "documentos",
  documents: "documentos",
};

const FIELD_ALIASES_FOLDED: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([key, value]) => [fold(key), value])
);

const ROOT_ALIASES: Record<string, string> = {
  canvas: "canvas",
  eap: "eap",
  esg: "esg",
  rip: "rip",
  compliance: "compliance",
  parecer_compliance: "compliance",
  pessoas: "pessoas",
  viabilidade_pessoas: "pessoas",
  viabilidade_de_pessoas_e_cultura: "pessoas",
  ti: "ti",
  viabilidade_ti: "ti",
  engenharia: "engenharia",
  viabilidade_engenharia: "engenharia",
  financeira: "financeira",
  financeiro: "financeira",
  viabilidade_financeira: "financeira",
  parecer_consolidado: "parecerConsolidado",
  parecerconsolidado: "parecerConsolidado",
  tap: "tap",
  tep: "tep",
  kickoff: "kickoff",
  kick_off: "kickoff",
  planner: "planner",
};

const BINARY_LABELS: Record<string, string> = {
  SIM: "SIM",
  NAO: "NÃO",
  NA: "N/A",
  A_DEFINIR: "A DEFINIR",
};

const STATUS_LABELS: Record<string, string> = {
  no_prazo: "No prazo",
  em_atencao: "Em atenção",
  atrasado: "Atrasado",
  sem_apuracao: "Sem apuração",
  parado: "Parado",
  encerrado: "Encerrado",
};

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown, fallback = "A definir"): string {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function parseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function clone<T>(value: T): T {
  try {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);
  } catch {
    return value;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "2026-11-06" → sexta 23:59:59.999 no fuso local. */
function endOfDayLocal(iso: string): number {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function resolveWeekEnd(ano: number, mes: number, semana: number): string {
  const weeks = listWeeksForMonth(ano, mes);
  const match = weeks.find((week) => week.week === semana);
  if (match) return match.weekEnd;

  const middle = new Date(ano, mes - 1, Math.min(28, (semana - 1) * 7 + 3), 12);
  return getWeekForDate(middle).weekEnd;
}

function logProjectId(log: AnyRecord): string {
  return String(log.projectId ?? log.project_id ?? log.project?.id ?? log.project ?? "");
}

function logRawDate(log: AnyRecord): unknown {
  return (
    log.changedAt ??
    log.changed_at ??
    log.updated_at ??
    log.created_at ??
    log.data ??
    log.date ??
    log.weekEnd ??
    log.week_end ??
    null
  );
}

function logTimestamp(log: AnyRecord, fallbackWeekEnd?: string): number {
  const raw = logRawDate(log);
  if (typeof raw === "string") {
    const value = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const local = new Date(
        Number(value.slice(0, 4)),
        Number(value.slice(5, 7)) - 1,
        Number(value.slice(8, 10)),
        12
      );
      if (!Number.isNaN(local.getTime())) return local.getTime();
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.getTime();

  const year = Number(log.year);
  const month = Number(log.month);
  const week = Number(log.week);
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(week) && month >= 1 && month <= 12) {
    const weekEnd = log.weekEnd ?? log.week_end ?? resolveWeekEnd(year, month, week);
    const parsed = endOfDayLocal(String(weekEnd));
    if (parsed > 0) return parsed;
  }

  return fallbackWeekEnd ? endOfDayLocal(fallbackWeekEnd) : 0;
}

function readChanges(log: AnyRecord): Array<{ field: string; oldValue: unknown }> {
  const result: Array<{ field: string; oldValue: unknown }> = [];
  const hasOld = (source: AnyRecord) =>
    "old_value" in source ||
    "oldValue" in source ||
    "previous_value" in source ||
    "previous" in source ||
    "de" in source;
  const oldOf = (source: AnyRecord) =>
    parseValue(source.old_value ?? source.oldValue ?? source.previous_value ?? source.previous ?? source.de ?? null);

  if (Array.isArray(log.changes)) {
    for (const change of log.changes) {
      if (typeof change !== "object" || change === null) continue;
      const field = change.field ?? change.campo;
      if (typeof field !== "string" || !field.trim()) continue;
      if (!hasOld(change)) continue;
      result.push({ field, oldValue: oldOf(change) });
    }
  }

  if (result.length === 0 && typeof log.field === "string" && hasOld(log)) {
    result.push({ field: log.field, oldValue: oldOf(log) });
  }

  // Estrutura alternativa frequente em bancos: snapshot "before" da linha.
  if (result.length === 0 && typeof log.before === "object" && log.before !== null) {
    for (const [field, value] of Object.entries(log.before)) {
      result.push({ field, oldValue: value });
    }
  }

  return result;
}

const ROOT_ALIASES_FOLDED: Record<string, string> = Object.fromEntries(
  Object.entries(ROOT_ALIASES).map(([key, value]) => [fold(key), value])
);

function normalizeFieldPath(field: string): string[] | null {
  const parts = field.split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((part) => FORBIDDEN_KEYS.has(part))) return null;

  const rootKey = parts[0];
  const camelRoot =
    FIELD_ALIASES[rootKey] ?? FIELD_ALIASES_FOLDED[fold(rootKey)] ?? rootKey;

  const knownRoots = new Set([...Object.values(FIELD_ALIASES), "documentos"]);
  if (!knownRoots.has(camelRoot)) return null;

  if (camelRoot !== "documentos") {
    return parts.length === 1 ? [camelRoot] : null;
  }

  if (parts.length < 2) return null;
  const docKey =
    ROOT_ALIASES[parts[1]] ?? ROOT_ALIASES_FOLDED[fold(parts[1])] ?? parts[1];
  if (FORBIDDEN_KEYS.has(docKey)) return null;
  if (parts.length === 2) return ["documentos", docKey];
  if (parts.length === 3 && ["status", "dataSolicitacao", "dataFinalizacao"].includes(parts[2])) {
    return ["documentos", docKey, parts[2]];
  }
  return null;
}

function applyValue(target: AnyRecord, field: string, value: unknown): void {
  const path = normalizeFieldPath(field);
  if (!path) return;

  let cursor: AnyRecord = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const current = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined;
    if (typeof current !== "object" || current === null) cursor[key] = {};
    cursor = cursor[key] as AnyRecord;
    if (typeof cursor !== "object" || cursor === null) return;
  }

  cursor[path[path.length - 1]] = parseValue(value);
}

function projectDocumentos(project: AnyRecord): AnyRecord {
  const docs = project.documentos ?? project.documents;
  return typeof docs === "object" && docs !== null ? docs : {};
}

function readDocument(project: AnyRecord, key: string): AnyRecord {
  const docs = projectDocumentos(project);
  if (docs[key] && typeof docs[key] === "object") return docs[key] as AnyRecord;

  const target = fold(key);
  for (const [docKey, value] of Object.entries(docs)) {
    if (fold(ROOT_ALIASES[fold(docKey)] ?? docKey) === target && typeof value === "object" && value !== null) {
      return value as AnyRecord;
    }
  }
  return { status: "A_DEFINIR", dataSolicitacao: null, dataFinalizacao: null };
}

function binaryLabel(value: unknown): string {
  const key = fold(value).toUpperCase();
  if (key === "SIM" || key === "S" || key === "TRUE") return BINARY_LABELS.SIM;
  if (key === "NAO" || key === "N" || key === "FALSE" || key === "NÃO") return BINARY_LABELS.NAO;
  if (key === "NA" || key === "NAO_SE_APLICA" || key === "NAOSEAPLICA") return BINARY_LABELS.NA;
  return BINARY_LABELS.A_DEFINIR;
}

function statusLabel(value: unknown): string {
  const key = String(value ?? "").trim();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  const match = Object.entries(STATUS_LABELS).find(([, label]) => fold(label) === fold(key));
  if (match) return match[1];
  return key ? text(key) : "A definir";
}

function buildProjectRow(project: AnyRecord): Array<string | number> {
  const tasks = Array.isArray(project.tarefasPriorizadas ?? project.tarefas_priorizadas)
    ? (project.tarefasPriorizadas ?? project.tarefas_priorizadas).slice(0, 5)
    : [];

  const percent = (value: unknown): number | "" => {
    if (value === null || value === undefined || value === "") return "";
    const numeric = Number(String(value).replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(numeric)) return "";
    const normalized = numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
    return Math.round(normalized * 1000) / 1000;
  };

  const values: Record<string, string | number> = {
    "ID do Projeto": text(project.id, ""),
    ATA: text(project.ata),
    "Tipo de Projeto": text(project.tipo ?? project.tipo_projeto),
    Fase: exportPhase(project.fase ?? project.phase),
    Projeto: text(project.nome ?? project.name),
    Sponsor: text(project.sponsor),
    Líder: text(project.lider ?? project.leader),
    PMO: text(project.pmo),
    "Avanço previsto": percent(project.avancoPrevisto ?? project.avanco_previsto),
    "Avanço Real %": percent(project.avancoReal ?? project.avanco_real),
    Status: statusLabel(project.status),
    "Resumo executivo": text(project.resumoExecutivo ?? project.resumo_executivo),
    Impedimentos: text(project.impedimentos),
    "Tarefa Priorizada 1": text(tasks[0]),
    "Tarefa Priorizada 2": text(tasks[1]),
    "Tarefa Priorizada 3": text(tasks[2]),
    "Tarefa Priorizada 4": text(tasks[3]),
    "Tarefa Priorizada 5": text(tasks[4]),
    "Previsão de go-live": exportDate(project.previsaoGoLive ?? project.previsao_go_live),
    "Chamado TopDesk": text(project.chamadoTopDesk ?? project.chamado_topdesk),
    "Material de Apoio": text(project.materialApoio ?? project.material_apoio),
    "Link do Planner": text(project.linkPlanner ?? project.link_planner),
    "Periodicidade da reunião": text(project.periodicidadeReuniao ?? project.periodicidade_reuniao),
    "Data da última reunião": exportDate(project.dataUltimaReuniao ?? project.data_ultima_reuniao),
    "Data da próxima reunião": exportDate(project.dataProximaReuniao ?? project.data_proxima_reuniao),
    "Data da última atualização do Planner": exportDate(
      project.ultimaAtualizacaoPlanner ?? project.ultima_atualizacao_planner
    ),
    x: "",
    "E-mail do Líder": text(project.emailLider ?? project.email_lider),
  };

  for (const columns of DOCUMENT_COLUMNS) {
    const document = readDocument(project, columns.key);
    const status = binaryLabel(document.status);
    values[columns.status[0]] = status;

    if (columns.key === "parecerConsolidado") continue;
    values[columns.dataSolicitacao[0]] = exportDate(document.dataSolicitacao);
    values[columns.dataFinalizacao[0]] = exportDate(document.dataFinalizacao);
  }

  return ["", ...STATUS_BACKUP_HEADERS.map((header) => values[header] ?? "")];
}

/**
 * Gera o Excel do estado do portfólio no fim de uma semana específica.
 *
 * @param projects lista de projetos (formato do site ou do Supabase)
 * @param logs     histórico append-only com alterações (changes/old_value)
 * @param ano      ano do mês da semana (ex.: 2026)
 * @param mes      mês 1-12 da semana (semana pertence ao mês da quarta-feira)
 * @param semana   número da semana dentro do mês (1-based)
 */
export function gerarExcelDaSemana(
  projects: any[],
  logs: any[],
  ano: number,
  mes: number,
  semana: number
): void {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(semana)) {
    throw new Error("Ano, mês e semana devem ser números inteiros.");
  }
  if (mes < 1 || mes > 12) throw new Error("Mês inválido. Informe um valor entre 1 e 12.");
  if (semana < 1 || semana > 6) throw new Error("Semana inválida. Informe um valor entre 1 e 6.");

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  const weekEnd = resolveWeekEnd(ano, mes, semana);
  const targetMs = endOfDayLocal(weekEnd);

  const snapshots = safeProjects.map((rawProject) => {
    if (typeof rawProject !== "object" || rawProject === null) return null;
    const project = clone(rawProject) as AnyRecord;

    const projectId = String(project.id ?? "");
    // Logs sem projectId são ambíguos: só podem ser aplicados quando a coleção
    // tem exatamente um projeto. Caso contrário, ignora para não contaminar.
    const allowAnonymous = safeProjects.length === 1;
    const projectLogs = safeLogs.filter((log) => {
      if (typeof log !== "object" || log === null) return false;
      const logId = logProjectId(log);
      if (logId === "") return allowAnonymous;
      return logId === projectId;
    });

    // Compatibilidade: projetos com histórico embutido (sem coleção externa).
    const embedded = Array.isArray(project.historico) ? (project.historico as any[]) : [];
    const source = projectLogs.length > 0 ? projectLogs : embedded;

    const future = source
      .filter((log): log is AnyRecord => typeof log === "object" && log !== null)
      .map((log) => ({ log, timestamp: logTimestamp(log, weekEnd) }))
      .filter((entry) => entry.timestamp > targetMs)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const { log } of future) {
      for (const change of readChanges(log)) {
        applyValue(project, change.field, change.oldValue);
      }
    }

    return project;
  }).filter((project): project is AnyRecord => project !== null);

  const [weekYear, weekMonth, weekDay] = weekEnd.split("-");
  const weekEndBr = `${weekDay}/${weekMonth}/${weekYear}`;

  const workbook = XLSX.utils.book_new();
  const rows: Array<Array<string | number>> = [
    [`Status Report - Snapshot Semanal ${weekEndBr} (${pad(mes)}/${ano} · Semana ${semana})`],
    [],
    ["", ...STATUS_BACKUP_HEADERS],
    ...snapshots.map(buildProjectRow),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 4 },
    ...STATUS_BACKUP_HEADERS.map((header) => ({
      wch: Math.min(42, Math.max(12, header.length + 2)),
    })),
  ];
  worksheet["!freeze"] = {
    xSplit: 1,
    ySplit: 3,
    topLeftCell: "B4",
    activePane: "bottomRight",
    state: "frozen",
  };
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 2, c: 1 },
      e: { r: Math.max(2, rows.length - 1), c: STATUS_BACKUP_HEADERS.length },
    }),
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, "NovS1");

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Backup_Status_${ano}-${pad(mes)}_S${semana}.xlsx`;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default gerarExcelDaSemana;
