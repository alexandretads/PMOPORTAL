import * as XLSX from "xlsx";
import type { PlannerPlan, PlannerTask } from "@/types";
import {
  headerKey,
  isoToDate,
  normalizeDate,
  normalizeKey,
  normalizePercent,
  normalizeText,
} from "@/lib/normalize";

interface SheetMatrix {
  name: string;
  rows: unknown[][];
  headerRowIndex: number;
}

const TASK_HEADERS = {
  numero: ["Número de tarefa", "Numero de tarefa"],
  nivel: ["Número do nível hierárquico", "Numero do nivel hierarquico", "Nível hierárquico"],
  nome: ["Nome", "Nome da tarefa"],
  atribuidoA: ["Atribuída a", "Atribuida a"],
  duracao: ["Duração", "Duracao"],
  tempoNecessario: ["Tempo necessário", "Tempo necessario"],
  inicio: ["Início", "Inicio"],
  concluir: ["Concluir", "Término", "Termino"],
  percentualConcluida: ["% concluída", "% concluida"],
  dependeDe: ["Depende de"],
  bucket: ["Bucket"],
} as const;

const METADATA_HEADERS = {
  nomeProjeto: ["Nome do projeto"],
  proprietario: ["Proprietário do plano", "Proprietario do plano"],
  exportadoEm: ["Exportado em"],
  percentualConcluida: ["% concluída", "% concluida"],
} as const;

/**
 * Lê um export do Microsoft Planner. O cabeçalho é detectado por
 * "Número de tarefa" em qualquer linha/aba, nunca por posição fixa.
 */
export async function parsePlannerExcel(file: File): Promise<PlannerPlan> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = findPlannerSheet(workbook);
  if (!sheet) {
    throw new Error(
      'Não foi possível localizar as tarefas. Verifique se o arquivo possui a coluna "Número de tarefa".'
    );
  }

  const taskHeaders = new Map<string, number>();
  sheet.rows[sheet.headerRowIndex]?.forEach((cell, index) => {
    const key = headerKey(cell);
    if (key && !taskHeaders.has(key)) taskHeaders.set(key, index);
  });

  const metadata = readMetadata(sheet);
  const tarefas: PlannerTask[] = [];
  const buckets: string[] = [];
  const seenBuckets = new Set<string>();

  for (let rowIndex = sheet.headerRowIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const numero = readTaskText(row, taskHeaders, [...TASK_HEADERS.numero]);
    const nome = readTaskText(row, taskHeaders, [...TASK_HEADERS.nome]);
    if (!numero && !nome) continue;

    const bucket = readTaskText(row, taskHeaders, [...TASK_HEADERS.bucket]);
    const tarefa: PlannerTask = {
      numero,
      nivel: readTaskText(row, taskHeaders, [...TASK_HEADERS.nivel]),
      nome,
      atribuidoA: readTaskText(row, taskHeaders, [...TASK_HEADERS.atribuidoA]),
      tempoNecessarioHoras: parseHoras(
        readTaskCell(row, taskHeaders, [...TASK_HEADERS.tempoNecessario])
      ),
      inicio: isoToDate(readTaskDate(row, taskHeaders, [...TASK_HEADERS.inicio])),
      concluir: isoToDate(readTaskDate(row, taskHeaders, [...TASK_HEADERS.concluir])),
      percentualConcluida:
        normalizePercent(
          readTaskCell(row, taskHeaders, [...TASK_HEADERS.percentualConcluida])
        ) ?? 0,
      bucket,
    };
    tarefas.push(tarefa);

    if (bucket && !seenBuckets.has(bucket)) {
      seenBuckets.add(bucket);
      buckets.push(bucket);
    }
  }

  return {
    nomeProjeto: readMetadataValue(metadata, [...METADATA_HEADERS.nomeProjeto]),
    proprietario: readMetadataValue(metadata, [...METADATA_HEADERS.proprietario]),
    percentualConcluida:
      normalizePercent(readMetadataValue(metadata, [...METADATA_HEADERS.percentualConcluida])) ?? 0,
    exportadoEm:
      isoToDate(readMetadataValue(metadata, [...METADATA_HEADERS.exportadoEm])) ?? new Date(),
    tarefas,
    buckets,
  };
}

function matrixFromSheet(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "dd/mm/yyyy",
    blankrows: false,
  });
}

function findPlannerSheet(workbook: XLSX.WorkBook): SheetMatrix | null {
  for (const name of workbook.SheetNames) {
    const rows = matrixFromSheet(workbook.Sheets[name]);
    const headerRowIndex = rows
      .slice(0, 80)
      .findIndex((row) => row.some((cell) => headerKey(cell) === "numerodetarefa"));
    if (headerRowIndex >= 0) return { name, rows, headerRowIndex };
  }
  return null;
}

function readMetadata(sheet: SheetMatrix): Map<string, unknown> {
  const metadata = new Map<string, unknown>();
  for (let index = 0; index < sheet.headerRowIndex; index += 1) {
    const row = sheet.rows[index] ?? [];
    const key = headerKey(row[0]);
    if (!key) continue;
    const value = row.slice(1).find((cell) => normalizeText(cell) !== "") ?? "";
    metadata.set(key, value);
  }
  return metadata;
}

function readMetadataValue(metadata: Map<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = metadata.get(headerKey(alias));
    if (value !== undefined && normalizeText(value) !== "") return normalizeText(value);
  }
  return "";
}

function readTaskCell(row: unknown[], headers: Map<string, number>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const index = headers.get(headerKey(alias));
    if (index !== undefined) {
      const value = row[index];
      if (value !== undefined && value !== null && normalizeText(value) !== "") return value;
    }
  }
  return "";
}

function readTaskText(row: unknown[], headers: Map<string, number>, aliases: string[]): string {
  return normalizeText(readTaskCell(row, headers, aliases));
}

function readTaskDate(
  row: unknown[],
  headers: Map<string, number>,
  aliases: string[]
): string | null {
  return normalizeDate(readTaskCell(row, headers, aliases));
}

/** Converte "2.024 horas", "8h" ou 2024 em horas numéricas. */
export function parseHoras(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = normalizeText(value);
  if (!raw) return 0;
  if (normalizeKey(raw) === "a definir") return 0;

  let numeric = raw
    .replace(/horas?/gi, "")
    .replace(/[hH]$/, "")
    .replace(/\s/g, "")
    .replace("%", "");

  if (numeric.includes(",") && numeric.includes(".")) {
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    numeric =
      lastComma > lastDot
        ? numeric.replace(/\./g, "").replace(",", ".")
        : numeric.replace(/,/g, "");
  } else if (numeric.includes(",")) {
    numeric = numeric.replace(",", ".");
  } else if (numeric.includes(".")) {
    const parts = numeric.split(".");
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length === 3) {
      numeric = numeric.replace(/\./g, "");
    }
  }

  const match = numeric.match(/-?\d*\.?\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
