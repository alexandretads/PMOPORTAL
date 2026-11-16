import * as XLSX from "xlsx";
import type { BinaryStatus, Project, ProjectDocument, StatusKey } from "@/types";
import { DOCUMENT_COLUMNS } from "@/lib/documentColumns";

/* =========================================================================
   Backup da planilha "Status dos Projetos Detalhado" — molde original.

   Estrutura:
   - A1: "Status Report - Backup DD/MM/AAAA"
   - Linha 2: vazia
   - Linha 3: cabeçalho (coluna A vazia + 68 colunas B..BQ)
   - Linha 4+: um projeto por linha

   Datas são convertidas exclusivamente por manipulação de string
   (AAAA-MM-DD → DD/MM/AAAA). Toda a lógica é textual: nenhum
   construtor de Date é usado, portanto não há deslocamento por fuso.
   ========================================================================= */

/** 68 nomes de colunas B..BQ. A coluna A permanece vazia. */
export const STATUS_BACKUP_HEADERS = [
  "ID do Projeto",
  "ATA",
  "Tipo de Projeto",
  "Fase",
  "Projeto",
  "Sponsor",
  "Líder",
  "PMO",
  "Avanço previsto",
  "Avanço Real %",
  "Status",
  "Resumo executivo",
  "Impedimentos",
  "Tarefa Priorizada 1",
  "Tarefa Priorizada 2",
  "Tarefa Priorizada 3",
  "Tarefa Priorizada 4",
  "Tarefa Priorizada 5",
  "Previsão de go-live",
  "Chamado TopDesk",
  "Material de Apoio",
  "Canvas",
  "Data do solicitação Canvas",
  "Data Finalizado em Canvas",
  "EAP",
  "Data da solicitação EAP",
  "Data Finalizado em EAP",
  "ESG",
  "Data da solicitação ESG",
  "Data Finalizado em ESG",
  "RIP",
  "Data da solicitação RIP",
  "Data Finalizado em RIP",
  "Parecer Compliance",
  "Data da solicitação Compliance",
  "Data Finalizado em Compliance",
  "Viabilidade de Pessoas e Cultura",
  "Data da solicitação Pessoas e Cultura",
  "Data Finalizado em Pessoas e Cultura",
  "Viabilidade de TI",
  "Data da solicitação TI",
  "Data Finalizado em TI",
  "Viabilidade da Engenharia",
  "Data da solicitação Engenharia",
  "Data Finalizado em Engenharia",
  "Viabilidade Financeira",
  "Data da solicitação Financeiro",
  "Data Finalizado em Financeiro",
  "Parecer Consolidado",
  "TAP",
  "Data da confecção TAP",
  "Data da assinatura TAP",
  "TEP",
  "Data da confecção TEP",
  "Data da assinatura TEP",
  "Kick-off",
  "Data prevista do Kick-off",
  "Data realizada do Kick-off",
  "Planner",
  "Data da solicitação/criação do Planner",
  "Data de disponibilização do Planner",
  "Link do Planner",
  "Periodicidade da reunião",
  "Data da última reunião",
  "Data da próxima reunião",
  "Data da última atualização do Planner",
  "x",
  "E-mail do Líder",
] as const;

export const STATUS_BACKUP_SHEET = "NovS1";

const STATUS_LABELS: Record<BinaryStatus, string> = {
  SIM: "SIM",
  NAO: "NÃO",
  NA: "N/A",
  A_DEFINIR: "A DEFINIR",
};

const PROJECT_STATUS_LABELS: Record<StatusKey, string> = {
  no_prazo: "No prazo",
  em_atencao: "Em atenção",
  atrasado: "Atrasado",
  sem_apuracao: "Sem apuração",
  parado: "Parado",
  encerrado: "Encerrado",
};

/** Fases do site → nomenclatura numerada usada na planilha original. */
const PHASE_WITH_NUMBER: Record<string, string> = {
  ideia: "1.Ideia",
  "analise de viabilidade": "2.Análise de Viabilidade",
  analise: "2.Análise de Viabilidade",
  viabilidade: "2.Análise de Viabilidade",
  aprovacao: "3.Aprovação",
  planejamento: "4.Planejamento",
  execucao: "5.Execução",
  encerramento: "6.Encerramento",
  parado: "9.Parado",
  pausado: "9.Parado",
  suspenso: "9.Parado",
  cancelado: "10.Cancelado",
};

const DOCUMENT_KEY_ALIASES: Record<string, string> = {
  financeiro: "financeira",
  viabilidadefinanceira: "financeira",
  viabilidadepessoas: "pessoas",
  viabilidadespessoas: "pessoas",
  viabilidadepessoasecultura: "pessoas",
  viabilidadeti: "ti",
  viabilidadeengenharia: "engenharia",
  parecer: "parecerConsolidado",
  parecerconsolidado: "parecerConsolidado",
  kick: "kickoff",
};

function normalizeDocumentKey(key: string): string {
  const compact = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return DOCUMENT_KEY_ALIASES[compact] ?? key;
}

function readDocument(project: Project, key: string): ProjectDocument {
  const direct = project.documentos?.[key];
  if (direct) return direct;

  const normalized = normalizeDocumentKey(key);
  const found = Object.entries(project.documentos ?? {}).find(
    ([candidate]) => normalizeDocumentKey(candidate) === normalized
  );

  return (
    found?.[1] ?? {
      status: "A_DEFINIR",
      dataSolicitacao: null,
      dataFinalizacao: null,
    }
  );
}

const EMPTY_DATE_TOKENS = new Set([
  "",
  "-",
  "--",
  "—",
  "a definir",
  "a-definir",
  "n/a",
  "na",
  "sem data",
]);

/* =========================================================================
   Datas por manipulação de STRING PURA (nenhum construtor de Date).
   - ISO AAAA-MM-DD  → DD/MM/AAAA por regex
   - DD/MM/AAAA      → mantém a ordem
   - Date nativo     → getters UTC
   - número          → serial do Excel/timestamp via aritmética civil
   ========================================================================= */

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Formata DD/MM/AAAA validando o calendário sem construir Date. */
function formatParts(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return "";
  if (year < 1900 || year > 2200) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > daysInMonth(year, month)) return "";
  return `${pad2(day)}/${pad2(month)}/${String(year).padStart(4, "0")}`;
}

function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = Math.floor(days) + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  let year = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  if (month <= 2) year += 1;
  return { year, month, day };
}

const EXCEL_EPOCH_OFFSET = 25569;

function formatExcelSerial(serial: number): string {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_466) return "";
  const { year, month, day } = civilFromDays(Math.floor(serial) - EXCEL_EPOCH_OFFSET);
  return formatParts(year, month, day);
}

function formatTimestamp(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) return "";
  const { year, month, day } = civilFromDays(Math.floor(milliseconds / 86_400_000));
  return formatParts(year, month, day);
}

/**
 * Converte datas do projeto em DD/MM/AAAA sem nenhuma construção de Date.
 * "2026-08-10" → "10/08/2026" (nunca "08/10/2026").
 */
export function exportDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return formatParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === "number") {
    return value > 10_000_000_000 ? formatTimestamp(value) : formatExcelSerial(value);
  }

  const raw = String(value).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (EMPTY_DATE_TOKENS.has(raw.toLowerCase())) return "";

  // Já em ISO (AAAA-MM-DD), com ou sem hora.
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (iso) return formatParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Já em DD/MM/AAAA — devolve padronizado sem trocar dia e mês.
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+.*)?$/);
  if (br) {
    const rawYear = Number(br[3]);
    return formatParts(rawYear < 100 ? 2000 + rawYear : rawYear, Number(br[2]), Number(br[1]));
  }

  return "";
}

/** Fase normalizada no site → fase numerada do molde. */
export function exportPhase(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "A definir";

  if (/^\d{1,2}\s*\./.test(raw)) return raw;

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return PHASE_WITH_NUMBER[key] ?? raw;
}

/** Texto obrigatório: preenche vazios com "A definir". */
function text(value: string | null | undefined, fallback = "A definir"): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  return clean || fallback;
}

/** Percentuais sempre numéricos com 3 casas (ex.: 0.738). */
function percent(value: number | null | undefined): number | "" {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return Math.round(value * 1000) / 1000;
}

function binaryLabel(status: BinaryStatus | undefined): string {
  return STATUS_LABELS[status ?? "A_DEFINIR"];
}

function buildProjectRow(project: Project): Array<string | number> {
  const tasks = Array.from({ length: 5 }, (_, index) =>
    text(project.tarefasPriorizadas?.[index], "A definir")
  );

  const row: Array<string | number> = [
    // Coluna A do molde é sempre vazia.
    "",
    text(project.id, ""),
    text(project.ata),
    text(project.tipo),
    exportPhase(project.fase),
    text(project.nome),
    text(project.sponsor),
    text(project.lider),
    text(project.pmo),
    percent(project.avancoPrevisto),
    percent(project.avancoReal),
    PROJECT_STATUS_LABELS[project.status] ?? "A definir",
    text(project.resumoExecutivo),
    text(project.impedimentos),
    ...tasks,
    exportDate(project.previsaoGoLive),
    text(project.chamadoTopDesk),
    "A definir", // Material de Apoio (não modelado)
  ];

  for (const columns of DOCUMENT_COLUMNS) {
    const document = readDocument(project, columns.key);
    const status = binaryLabel(document.status);

    // No molde, o Parecer Consolidado possui apenas a coluna de status.
    if (columns.key === "parecerConsolidado") {
      row.push(status);
      continue;
    }

    row.push(status, exportDate(document.dataSolicitacao), exportDate(document.dataFinalizacao));
  }

  row.push(
    text(project.linkPlanner),
    "A definir", // Periodicidade da reunião (não modelada no site)
    exportDate(project.dataUltimaReuniao),
    exportDate(project.dataProximaReuniao),
    exportDate(project.ultimaAtualizacaoPlanner),
    "", // x residual
    text(project.emailLider)
  );

  return row;
}

/** Data local do report em ISO, calculada por Intl a partir do timestamp. */
function todayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Campo_Grande",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(Date.now());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayBr(): string {
  const iso = todayIso();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Gera o backup semanal idêntico ao molde "Status dos Projetos Detalhado".
 * Retorna o nome do arquivo e dispara o download no navegador.
 */
export function exportStatusExcel(projects: Project[]): string {
  const workbook = XLSX.utils.book_new();
  const rows: Array<Array<string | number>> = [
    [`Status Report - Backup ${todayBr()}`],
    [],
    ["", ...STATUS_BACKUP_HEADERS],
    ...projects.map(buildProjectRow),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 4 }, // A vazia
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 26 },
    { wch: 36 },
    { wch: 24 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 48 },
    { wch: 40 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 26 },
    { wch: 24 },
    { wch: 34 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 8 },
    { wch: 28 },
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

  XLSX.utils.book_append_sheet(workbook, worksheet, STATUS_BACKUP_SHEET);

  const fileName = `Backup_Status_${todayIso()}.xlsx`;
  downloadWorkbook(workbook, fileName);
  return fileName;
}

/** Download via Blob + âncora (mais confiável entre navegadores). */
function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string): void {
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  });

  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
