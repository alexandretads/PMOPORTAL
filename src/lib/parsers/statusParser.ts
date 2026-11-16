import * as XLSX from "xlsx";
import type { BinaryStatus, Project, ProjectDocument, StatusKey } from "@/types";
import {
  extractCicloFromFileName,
  headerKey,
  normalizeBinary,
  normalizeFase,
  normalizeKey,
  normalizePercent,
  normalizeStatusKey,
  normalizeText,
} from "@/lib/normalize";
import { DOCUMENT_COLUMNS } from "@/lib/documentColumns";

interface SheetMatrix {
  name: string;
  rows: unknown[][];
  headerRowIndex: number;
}

/**
 * Lê a planilha de status e devolve os projetos normalizados.
 * O cabeçalho é encontrado pelo texto "ID do Projeto" em qualquer aba, com
 * preferência pela aba "NovS1". Nenhuma posição fixa é assumida.
 */
export async function parseStatusExcel(file: File): Promise<Project[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = findStatusSheet(workbook);
  if (!sheet) {
    throw new Error(
      'Não foi possível localizar a planilha de status. Verifique se o arquivo possui a coluna "ID do Projeto".'
    );
  }

  const headers = new Map<string, number>();
  sheet.rows[sheet.headerRowIndex]?.forEach((cell, index) => {
    const key = headerKey(cell);
    if (key && !headers.has(key)) headers.set(key, index);
  });

  const projects: Project[] = [];
  const seenIds = new Set<string>();

  for (let rowIndex = sheet.headerRowIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const id = readText(row, headers, ["ID do Projeto", "ID Projeto"]);
    const nome = readText(row, headers, ["Projeto", "Nome do Projeto"]);
    if (!id || !nome || seenIds.has(id)) continue;

    const fase = normalizeFase(readText(row, headers, ["Fase"]));
    const rawStatus = readText(row, headers, ["Status", "Situação"]);
    const status = resolveProjectStatus(rawStatus, fase.nome);

    const documentos: Record<string, ProjectDocument> = {};
    for (const document of DOCUMENT_COLUMNS) {
      documentos[document.key] = {
        status: readDocumentStatus(row, headers, [...document.status]),
        dataSolicitacao: readDate(row, headers, [...document.dataSolicitacao]),
        dataFinalizacao: readDate(row, headers, [...document.dataFinalizacao]),
      };
    }

    const tarefasPriorizadas = [1, 2, 3, 4, 5]
      .map((position) =>
        readText(row, headers, [`Tarefa Priorizada ${position}`, `Tarefa priorizada ${position}`])
      )
      .filter((task) => task.length > 0 && !isPlaceholder(task));

    seenIds.add(id);
    projects.push({
      id,
      ata: readText(row, headers, ["ATA"]),
      tipo: readText(row, headers, ["Tipo de Projeto", "Tipo"]),
      fase: fase.nome || readText(row, headers, ["Fase"]),
      faseOrdem: fase.ordem,
      nome,
      sponsor: readText(row, headers, ["Sponsor"]),
      lider: readText(row, headers, ["Líder", "Lider"]),
      pmo: readText(row, headers, ["PMO"]),
      emailLider: readText(row, headers, ["E-mail do Líder", "Email do Líder"]),
      avancoPrevisto: normalizePercent(readText(row, headers, ["Avanço previsto"])),
      avancoReal: normalizePercent(readText(row, headers, ["Avanço Real %", "Avanço Real"])),
      status,
      resumoExecutivo: readText(row, headers, ["Resumo executivo", "Resumo Executivo"]),
      impedimentos: readText(row, headers, ["Impedimentos", "Impedimento"]),
      tarefasPriorizadas,
      previsaoGoLive: readDate(row, headers, ["Previsão de go-live", "Previsão go-live"]),
      chamadoTopDesk: readText(row, headers, ["Chamado TopDesk", "Chamado"]),
      linkPlanner: readTextOrNull(row, headers, ["Link do Planner"]),
      ultimaAtualizacaoPlanner: readDate(row, headers, [
        "Data da última atualização do Planner",
        "Data última atualização do Planner",
        "Data última atualização Planner",
      ]),
      dataUltimaReuniao: readDate(row, headers, [
        "Data da última reunião",
        "Data última reunião",
      ]),
      dataProximaReuniao: readDate(row, headers, [
        "Data da próxima reunião",
        "Data próxima reunião",
      ]),
      documentos,
    });
  }

  return projects;
}

function matrixFromSheet(sheet: XLSX.WorkSheet): unknown[][] {
  // raw:true preserva Date/número das células de data. Com raw:false o SheetJS
  // devolve texto no formato da planilha (mm/dd ou dd/mm), o que causava a
  // inversão dia/mês em datas com dia <= 12.
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });
}

function findStatusSheet(workbook: XLSX.WorkBook): SheetMatrix | null {
  const preferredName = workbook.SheetNames.find((name) => headerKey(name) === "novs1");
  const orderedNames = preferredName
    ? [preferredName, ...workbook.SheetNames.filter((name) => name !== preferredName)]
    : workbook.SheetNames;

  for (const name of orderedNames) {
    const rows = matrixFromSheet(workbook.Sheets[name]);
    const headerRowIndex = rows
      .slice(0, 80)
      .findIndex((row) => row.some((cell) => headerKey(cell) === "iddoprojeto"));
    if (headerRowIndex >= 0) {
      return { name, rows, headerRowIndex };
    }
  }
  return null;
}

/**
 * Localiza a coluna pelo nome canônico ou alias.
 * `headerKey` remove espaços (inclusive duplos), acentos e pontuação, então
 * "Data Finalizado em  Canvas" e "Data Finalizado em Canvas" geram a mesma
 * chave. Não usamos busca parcial por palavras, pois isso pode casar a coluna
 * de outro documento (ex.: "Data Finalizado em TI" → Canvas).
 */
function findHeaderIndex(headers: Map<string, number>, name: string): number | undefined {
  return headers.get(headerKey(name));
}

function readCell(row: unknown[], headers: Map<string, number>, names: string[]): unknown {
  for (const name of names) {
    const index = findHeaderIndex(headers, name);
    if (index !== undefined) {
      const value = row[index];
      if (value !== undefined && value !== null && normalizeText(value) !== "") return value;
    }
  }
  return "";
}

function readText(row: unknown[], headers: Map<string, number>, names: string[]): string {
  return normalizeText(readCell(row, headers, names));
}

function readTextOrNull(row: unknown[], headers: Map<string, number>, names: string[]): string | null {
  const text = readText(row, headers, names);
  if (!text || isPlaceholder(text)) return null;
  return text;
}

/* =========================================================================
   Datas por manipulação de STRING PURA.
   Nenhuma construção de Date é feita aqui. Objetos Date vindos do SheetJS
   são lidos em UTC; números (serial do Excel/timestamp) usam aritmética civil.
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

/** Valida e devolve AAAA-MM-DD, sem criar Date. */
function isoFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2200) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Converte dias desde 1970-01-01 em ano/mês/dia (algoritmo civil de Hinnant).
 * Função puramente aritmética, sem Date e sem fuso horário.
 */
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

const EXCEL_EPOCH_OFFSET = 25569; // dias entre 1899-12-30 e 1970-01-01

function isoFromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_466) return null;
  const days = Math.floor(serial) - EXCEL_EPOCH_OFFSET;
  const { year, month, day } = civilFromDays(days);
  return isoFromParts(year, month, day);
}

function isoFromTimestamp(milliseconds: number): string | null {
  if (!Number.isFinite(milliseconds)) return null;
  const { year, month, day } = civilFromDays(Math.floor(milliseconds / 86_400_000));
  return isoFromParts(year, month, day);
}

/**
 * Converte qualquer data da planilha em ISO (AAAA-MM-DD).
 * - string ISO → normaliza e mantém a ordem
 * - string DD/MM/AAAA → inverte por split/regex
 * - Date nativo → componentes UTC
 * - número → serial do Excel ou timestamp (aritmética pura)
 * - vazio/A definir/N/A/N/I → null
 */
export function parseDateSeguro(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const raw = value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    if (!raw) return null;

    const key = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (
      key === "a definir" ||
      key === "adefinir" ||
      key === "n/a" ||
      key === "na" ||
      key === "ni" ||
      key === "n/i" ||
      key === "nia" ||
      key.includes("nao se aplica") ||
      key.includes("sem data") ||
      key.includes("a definir")
    ) {
      return null;
    }

    // Já é ISO, com ou sem hora: 2026-08-10T00:00:00.000Z
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

    // Formato brasileiro: 10/08/2026, 1/8/2026 ou 27/08/2026 14h
    const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+.*)?$/);
    if (br) {
      const rawYear = Number(br[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      return isoFromParts(year, Number(br[2]), Number(br[1]));
    }

    return null;
  }

  // Date nativo entregue pelo Excel (cellDates: true): apenas getters UTC.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return isoFromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === "number") {
    return value > 10_000_000_000 ? isoFromTimestamp(value) : isoFromExcelSerial(value);
  }

  return null;
}

function readDate(row: unknown[], headers: Map<string, number>, names: string[]): string | null {
  return parseDateSeguro(readCell(row, headers, names));
}

function readDocumentStatus(
  row: unknown[],
  headers: Map<string, number>,
  names: string[]
): BinaryStatus {
  return normalizeBinary(readCell(row, headers, names));
}

function isPlaceholder(value: string): boolean {
  const key = normalizeKey(value);
  return key === "a definir" || key === "-" || key === "—" || key === "n/a" || key === "na";
}

function resolveProjectStatus(rawStatus: string, faseName: string): StatusKey {
  const parsed = normalizeStatusKey(rawStatus);
  if (parsed) return parsed;

  const phase = normalizeKey(faseName);
  if (phase.includes("parado") || phase.includes("pausad") || phase.includes("suspens")) {
    return "parado";
  }
  if (phase.includes("encerramento") || phase.includes("cancelado")) return "encerrado";
  return "sem_apuracao";
}

export { extractCicloFromFileName };
