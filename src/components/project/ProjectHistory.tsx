import { useMemo } from "react";
import { History } from "lucide-react";
import { getWeekForDate } from "@/lib/calc/weekCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

/**
 * Feed de alterações agrupado por mês/semana.
 * Recebe `logs` por prop, sem acessar store ou banco.
 */
interface ProjectHistoryProps {
  logs?: any[];
  className?: string;
  title?: string;
  emptyMessage?: string;
}

interface NormalizedChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface NormalizedLog {
  id: string;
  timestamp: Date | null;
  iso: string;
  title: string;
  description: string;
  source: string;
  changes: NormalizedChange[];
  year: number;
  month: number;
  week: number;
}

interface HistoryGroup {
  key: string;
  label: string;
  sort: number;
  logs: NormalizedLog[];
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  sponsor: "Sponsor",
  lider: "Líder",
  pmo: "PMO",
  tipo: "Tipo",
  fase: "Fase",
  status: "Status",
  resumo_executivo: "Resumo executivo",
  resumoExecutivo: "Resumo executivo",
  impedimentos: "Impedimentos",
  previsao_go_live: "Previsão de go-live",
  previsaoGoLive: "Previsão de go-live",
  chamado_topdesk: "Chamado TopDesk",
  chamadoTopDesk: "Chamado TopDesk",
  avanco_real: "Avanço Real %",
  avancoReal: "Avanço Real %",
  avanco_previsto: "Avanço previsto",
  avancoPrevisto: "Avanço previsto",
  ultima_atualizacao_planner: "Última atualização do Planner",
  ultimaAtualizacaoPlanner: "Última atualização do Planner",
  data_ultima_reuniao: "Data da última reunião",
  dataUltimaReuniao: "Data da última reunião",
  data_proxima_reuniao: "Data da próxima reunião",
  dataProximaReuniao: "Data da próxima reunião",
  link_planner: "Link do Planner",
  linkPlanner: "Link do Planner",
  email_lider: "E-mail do Líder",
  emailLider: "E-mail do Líder",
  tarefas_priorizadas: "Tarefas priorizadas",
  tarefasPriorizadas: "Tarefas priorizadas",
};

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];

  // documentos.canvas.status → "Canvas — Status"
  const parts = field.split(".");
  if (parts[0] === "documentos" && parts.length >= 2) {
    const doc = parts[1];
    const prettyDoc = FIELD_LABELS[doc] ?? doc.charAt(0).toUpperCase() + doc.slice(1);
    const last = parts[parts.length - 1];
    const prettyProp =
      last === "dataSolicitacao"
        ? "solicitação"
        : last === "dataFinalizacao"
          ? "finalização"
          : last === "status"
            ? "status"
            : last;
    return `${prettyDoc} — ${prettyProp}`;
  }

  const spaced = field.replace(/[_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Datas puras são interpretadas ao meio-dia local (sem deslocamento de fuso). */
function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12);
  }
  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) {
    return new Date(Number(brDate[3]), Number(brDate[2]) - 1, Number(brDate[1]), 12);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readChanges(log: any): NormalizedChange[] {
  const changes: NormalizedChange[] = [];

  if (Array.isArray(log?.changes)) {
    for (const change of log.changes) {
      if (typeof change !== "object" || change === null) continue;
      const field = change.field ?? change.campo ?? change.key;
      if (typeof field !== "string" || !field.trim()) continue;
      changes.push({
        field,
        oldValue: change.old_value ?? change.oldValue ?? change.previous_value ?? change.de ?? null,
        newValue: change.new_value ?? change.newValue ?? change.current_value ?? change.para ?? null,
      });
    }
  }

  if (changes.length === 0 && typeof log?.field === "string") {
    changes.push({
      field: log.field,
      oldValue: log.old_value ?? log.oldValue ?? null,
      newValue: log.new_value ?? log.newValue ?? null,
    });
  }

  return changes;
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "boolean") return value ? "SIM" : "NÃO";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "vazio";
    const isPercent = /avanco|percent|%/i.test(field);
    if (isPercent && Math.abs(value) <= 1) {
      return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    }
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }

  if (Array.isArray(value)) {
    const list = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return list.length === 0 ? "vazio" : list.join(", ");
  }

  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return json.length > 120 ? `${json.slice(0, 117)}...` : json;
    } catch {
      return "objeto";
    }
  }

  const text = String(value).trim();
  if (!text) return "vazio";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

/** Exibe o horário no fuso de Campo Grande, independente do dispositivo. */
function formatDateTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Campo_Grande",
    })
      .format(date)
      .replace(",", " às");
  } catch {
    return date.toLocaleString("pt-BR");
  }
}

function normalizeLog(log: any, index: number): NormalizedLog | null {
  if (typeof log !== "object" || log === null) return null;

  const rawDate =
    log.changedAt ??
    log.changed_at ??
    log.updated_at ??
    log.created_at ??
    log.data ??
    log.date ??
    null;
  const timestamp = parseTimestamp(rawDate);
  const changes = readChanges(log);

  // Sem data e sem ano/mês/semana gravados não há como agrupar.
  const hasStoredWeek =
    Number.isFinite(Number(log.year)) &&
    Number.isFinite(Number(log.month)) &&
    Number.isFinite(Number(log.week));

  if (!timestamp && !hasStoredWeek) return null;

  const derived = timestamp ? getWeekForDate(timestamp) : null;
  const year = hasStoredWeek ? Number(log.year) : derived?.year ?? 0;
  const month = hasStoredWeek ? Number(log.month) : derived?.month ?? 0;
  const week = hasStoredWeek ? Number(log.week) : derived?.week ?? 0;

  if (month < 1 || month > 12 || week < 1) return null;

  const description =
    typeof log.description === "string"
      ? log.description
      : typeof log.descricao === "string"
        ? log.descricao
        : "";

  const source =
    typeof log.source === "string"
      ? log.source
      : typeof log.origem === "string"
        ? log.origem
        : typeof log.source_detail === "string"
          ? log.source_detail
          : "";

  return {
    id: String(log.id ?? `log-${index}`),
    timestamp,
    iso: timestamp ? timestamp.toISOString() : "",
    title:
      changes.length > 0
        ? `${changes.length} ${changes.length === 1 ? "campo alterado" : "campos alterados"}`
        : description || "Alteração registrada",
    description,
    source,
    changes,
    year,
    month,
    week,
  };
}

export function ProjectHistory({
  logs,
  className,
  title = "Histórico de alterações",
  emptyMessage = "Sem alterações registradas para este projeto.",
}: ProjectHistoryProps) {
  const groups = useMemo<HistoryGroup[]>(() => {
    const list = Array.isArray(logs) ? logs : [];
    const normalized = list
      .map((log, index) => normalizeLog(log, index))
      .filter((log): log is NormalizedLog => log !== null)
      .sort((a, b) => b.iso.localeCompare(a.iso));

    const map = new Map<string, HistoryGroup>();
    for (const log of normalized) {
      const key = `${log.year}-${log.month}-${log.week}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${MONTHS[log.month - 1]}/${log.year} - Semana ${log.week}`,
          sort: log.year * 10000 + log.month * 100 + log.week,
          logs: [],
        });
      }
      map.get(key)?.logs.push(log);
    }

    return Array.from(map.values())
      .sort((a, b) => b.sort - a.sort)
      .map((group) => ({
        ...group,
        logs: group.logs.sort((a, b) =>
          (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0)
        ),
      }));
  }, [logs]);

  const total = groups.reduce((sum, group) => sum + group.logs.length, 0);

  return (
    <section
      id="project-history"
      aria-labelledby="project-history-title"
      className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="project-history-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <History size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-[11.5px] text-text2">
            Registros agrupados por mês e semana de acompanhamento.
          </p>
        </div>
        <span className="inline-flex h-7 items-center rounded-full border border-border bg-bg px-2.5 text-[10px] font-semibold tabular-nums text-text2">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </header>

      <div className="mt-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={History}
            title={emptyMessage}
            className="border-0 bg-bg/40 px-4 py-6 [&>h3]:mt-2.5 [&>h3]:text-[13px] [&>h3]:font-medium [&>h3]:text-text2 [&>span]:h-10 [&>span]:w-10 [&>span>svg]:h-[18px] [&>span>svg]:w-[18px]"
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <header className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                    {group.label}
                  </h3>
                  <span className="text-[9.5px] tabular-nums text-text2">
                    {group.logs.length} {group.logs.length === 1 ? "alteração" : "alterações"}
                  </span>
                </header>

                <ol className="space-y-2">
                  {group.logs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-md border border-border bg-bg/30 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[11.5px] font-semibold text-text">{log.title}</p>
                        <span className="shrink-0 text-[10px] tabular-nums text-text2">
                          {log.timestamp ? formatDateTime(log.timestamp) : "sem data"}
                        </span>
                      </div>

                      {log.changes.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {log.changes.map((change, index) => (
                            <li
                              key={`${log.id}-${change.field}-${index}`}
                              className="text-[11.5px] leading-relaxed text-text2"
                            >
                              O campo{" "}
                              <strong className="font-semibold text-text">
                                {fieldLabel(change.field)}
                              </strong>{" "}
                              foi alterado de{" "}
                              <span className="rounded bg-status-danger/[0.07] px-1 py-0.5 text-status-danger">
                                {formatValue(change.field, change.oldValue)}
                              </span>{" "}
                              para{" "}
                              <span className="rounded bg-status-ok/[0.08] px-1 py-0.5 font-medium text-status-ok">
                                {formatValue(change.field, change.newValue)}
                              </span>
                              .
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[11.5px] leading-relaxed text-text2">
                          {log.description || "Nenhum detalhe de campo disponível neste registro."}
                        </p>
                      )}

                      {log.source ? (
                        <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.08em] text-text2">
                          Origem: {log.source}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProjectHistory;
