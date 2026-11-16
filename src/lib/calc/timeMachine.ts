import type { Project } from "@/types";
import {
  getWeekForDate,
  listWeeksForMonth,
  type ChangeLogEntry,
  type WeekInfo,
} from "@/lib/calc/weekCalendar";

export interface HistoricalFieldChange {
  field: string;
  oldValue: unknown;
  newValue?: unknown;
}

/**
 * O log atual é descritivo. Os campos abaixo são opcionais para preservar
 * registros antigos e permitir a reconstrução de valores quando disponíveis.
 */
export interface TemporalHistoryEntry extends ChangeLogEntry {
  changedAt?: string;
  changes?: HistoricalFieldChange[];
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface TimeSelection {
  year: number;
  month: number;
  week: number;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(project: Project): UnknownRecord {
  return project as unknown as UnknownRecord;
}

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fallback JSON abaixo.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function cloneProject(project: Project): Project {
  const clone = cloneValue(project);
  return Object.assign(clone, { historico: [] }) as Project;
}

function parseSerialized(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  if (value === "null") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const FORBIDDEN_PATH_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ALLOWED_FIELD_ROOTS = new Set([
  "ata",
  "tipo",
  "fase",
  "faseOrdem",
  "nome",
  "sponsor",
  "lider",
  "pmo",
  "emailLider",
  "avancoPrevisto",
  "avancoReal",
  "status",
  "resumoExecutivo",
  "impedimentos",
  "tarefasPriorizadas",
  "previsaoGoLive",
  "chamadoTopDesk",
  "linkPlanner",
  "ultimaAtualizacaoPlanner",
  "dataUltimaReuniao",
  "dataProximaReuniao",
  "documentos",
]);

/**
 * Aceita apenas caminhos de campos reais do projeto. Bloqueia chaves de
 * prototype pollution (`__proto__`, `constructor`, `prototype`) e raízes
 * desconhecidas vindas de históricos importados.
 */
export function isSafeFieldPath(field: unknown): field is string {
  if (typeof field !== "string") return false;
  const parts = field.split(".").filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.some((part) => FORBIDDEN_PATH_KEYS.has(part))) return false;
  if (!ALLOWED_FIELD_ROOTS.has(parts[0])) return false;

  if (parts[0] === "tarefasPriorizadas") {
    return parts.length === 2 && /^\d+$/.test(parts[1]);
  }
  if (parts[0] === "documentos") {
    if (parts.length !== 3) return false;
    if (FORBIDDEN_PATH_KEYS.has(parts[1])) return false;
    return ["status", "dataSolicitacao", "dataFinalizacao"].includes(parts[2]);
  }
  return parts.length === 1;
}

function applyFieldValue(target: UnknownRecord, field: string, value: unknown): void {
  if (!isSafeFieldPath(field)) return;

  const parts = field.split(".").filter(Boolean);
  let cursor: UnknownRecord = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    // Somente propriedades próprias: nunca segue/decorre Object.prototype.
    const next = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined;
    if (typeof next !== "object" || next === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as UnknownRecord;
    if (typeof cursor !== "object" || cursor === null) return;
  }

  cursor[parts[parts.length - 1]] = cloneValue(value);
}

/**
 * Converte "YYYY-MM-DD" em um instante LOCAL (meio-dia), não UTC.
 * `new Date("2026-11-09")` é meia-noite UTC; em Manaus (UTC-4) isso cai no
 * domingo anterior e joga a atualização para a semana errada. O meio-dia local
 * elimina qualquer risco de virada de dia por fuso.
 */
function localDateFromIso(value: string, hour = 12): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseInstant(value: string | null | undefined): number {
  if (!value) return 0;
  const text = value.trim();
  if (!text) return 0;

  // Data pura: interpreta como dia local (meio-dia), nunca UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const local = localDateFromIso(text);
    return local ? local.getTime() : 0;
  }

  // Data/hora sem offset: já está no fuso local do navegador.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text) && !/(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsed = new Date(text.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  // ISO completo com Z/offset: é um instante absoluto, mantém o valor.
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function entryTimestamp(entry: TemporalHistoryEntry): number {
  const timestamp = parseInstant(entry.changedAt ?? entry.data);
  if (timestamp > 0) {
    // Sábado/domingo são fim de semana: não existe dia útil posterior à sexta.
    // Atribuímos o registro ao fim da semana (sexta 23:59) para que o snapshot
    // daquela semana não o trate como "futuro" e o desfaça.
    const local = new Date(timestamp);
    const day = local.getDay();
    if (day === 0 || day === 6) {
      const week = getWeekForDate(local);
      const weekEnd = endOfWeekMs(week.weekEnd);
      return weekEnd > 0 ? Math.min(timestamp, weekEnd) : timestamp;
    }
    return timestamp;
  }

  const fallback = endOfWeekMs(entry.weekEnd);
  return fallback > 0 ? fallback : 0;
}

/** Fim do dia LOCAL da sexta informada (nunca UTC). */
function endOfWeekMs(weekEnd: string): number {
  const local = localDateFromIso(weekEnd, 23);
  return local ? local.getTime() : 0;
}

/** Lê o histórico append-only de um projeto, validando o formato mínimo. */
export function projectHistory(project: Project): TemporalHistoryEntry[] {
  const candidate = asRecord(project).historico;
  if (!Array.isArray(candidate)) return [];

  const entries: TemporalHistoryEntry[] = [];
  for (const item of candidate) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as UnknownRecord;
    if (typeof record.data !== "string" && typeof record.changedAt !== "string") continue;

    const rawDate = typeof record.changedAt === "string" ? record.changedAt : (record.data as string);
    const instant = parseInstant(rawDate);

    // Data pura: meio-dia local. Data/hora completa: instante absoluto,
    // convertido para o fuso LOCAL do navegador (nunca UTC bruto).
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim());
    const local = dateOnly
      ? localDateFromIso(rawDate.trim())
      : instant > 0
        ? new Date(instant)
        : null;
    if (!local) continue;

    // Usa a semana gravada quando existir; caso contrário, deriva no fuso local.
    const derived = getWeekForDate(local);
    const year = typeof record.year === "number" ? record.year : derived.year;
    const month = typeof record.month === "number" ? record.month : derived.month;
    const week = typeof record.week === "number" ? record.week : derived.week;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(week)) continue;
    if (month < 1 || month > 12 || week < 1) continue;

    entries.push({
      ...(record as unknown as ChangeLogEntry),
      data:
        typeof record.data === "string"
          ? record.data
          : `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`,
      year,
      month,
      week,
      weekStart: typeof record.weekStart === "string" ? record.weekStart : derived.weekStart,
      weekEnd: typeof record.weekEnd === "string" ? record.weekEnd : derived.weekEnd,
    });
  }
  return entries;
}

/** Semana exata (segunda a sexta) para a chave gravada no histórico. */
export function weekForSelection(selection: TimeSelection): WeekInfo | null {
  return (
    listWeeksForMonth(selection.year, selection.month).find(
      (week) => week.week === selection.week
    ) ?? null
  );
}

/**
 * Reconstrói o estado do projeto ao FIM de uma semana específica.
 * Parte do estado atual e desfaz, de trás para frente, toda alteração cujo
 * timestamp é posterior ao alvo.
 */
export function projectSnapshotAt(project: Project, weekEnd: string): Project {
  const targetMs = endOfWeekMs(weekEnd);
  const snapshot = cloneProject(project);
  // Data-alvo inválida: devolve o estado atual em vez de desfazer tudo.
  if (targetMs <= 0) return snapshot;

  const future = [...projectHistory(project)]
    .filter((entry) => entryTimestamp(entry) > targetMs)
    .sort((a, b) => entryTimestamp(b) - entryTimestamp(a));

  for (const entry of future) {
    if (Array.isArray(entry.changes) && entry.changes.length > 0) {
      for (const change of entry.changes) {
        if (typeof change.field !== "string" || change.field.length === 0) continue;
        applyFieldValue(asRecord(snapshot), change.field, change.oldValue);
      }
      continue;
    }

    if (typeof entry.field === "string" && entry.field.length > 0) {
      applyFieldValue(asRecord(snapshot), entry.field, parseSerialized(entry.oldValue));
    }
  }

  return snapshot;
}

/** Última alteração (qualquer campo) até o fim da semana alvo. */
export function lastUpdateAtOrBefore(
  project: Project,
  weekEnd: string
): TemporalHistoryEntry | null {
  const targetMs = endOfWeekMs(weekEnd);
  const candidates = projectHistory(project)
    .filter((entry) => entryTimestamp(entry) <= targetMs)
    .sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
  return candidates[0] ?? null;
}

/** True quando a semana (chave ano/mês/semana) possui alterações registradas. */
export function hasUpdatesInWeek(
  project: Project,
  year: number,
  month: number,
  week: number
): boolean {
  return projectHistory(project).some(
    (entry) => entry.year === year && entry.month === month && entry.week === week
  );
}

function selectionEndMs(selection: TimeSelection): number {
  const week = weekForSelection(selection);
  if (week) return endOfWeekMs(week.weekEnd);
  // Fallback conservador para semanas não presentes no calendário do mês.
  const wednesday = getWeekForDate(
    new Date(selection.year, selection.month - 1, (selection.week - 1) * 7 + 3)
  );
  return endOfWeekMs(wednesday.weekEnd);
}

/** Semana registrada mais próxima da semana alvo, por distância no calendário. */
export function nearestWeekWithUpdate(
  project: Project,
  targetYear: number,
  targetMonth: number,
  targetWeek: number
): TimeSelection | null {
  const history = projectHistory(project);
  if (history.length === 0) return null;

  const targetMs = selectionEndMs({
    year: targetYear,
    month: targetMonth,
    week: targetWeek,
  });

  const candidates = history
    .map((entry) => ({
      year: entry.year,
      month: entry.month,
      week: entry.week,
      distance: Math.abs(selectionEndMs(entry) - targetMs),
      timestamp: selectionEndMs(entry),
    }))
    .sort((a, b) => a.distance - b.distance || a.timestamp - b.timestamp);

  const best = candidates[0];
  return best ? { year: best.year, month: best.month, week: best.week } : null;
}

/**
 * Estado atual equivale ao snapshot ao fim da semana da alteração mais
 * recente. O projeto já é cumulativo, então retornamos a própria referência.
 */
export function currentSnapshot(project: Project): Project {
  return project;
}

/** Datas da semana selecionada, com fallback para o calendário por semana. */
export function weekInfoForSelection(selection: TimeSelection): WeekInfo {
  const exact = weekForSelection(selection);
  if (exact) return exact;
  return getWeekForDate(
    new Date(selection.year, selection.month - 1, (selection.week - 1) * 7 + 3)
  );
}

export { entryTimestamp };
