import type { BinaryStatus, ParsedFase, StatusKey } from "@/types";

const MONTHS_PT = [
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

const EMPTY_DATE_VALUES = new Set([
  "",
  "-",
  "--",
  "—",
  "a definir",
  "adefinir",
  "a definir data",
  "na",
  "n/a",
  "nao informado",
  "nao informada",
  "sem data",
  "pendente",
  "00/00/0000",
]);

const INVALID_PERCENT_VALUES = new Set([
  "",
  "-",
  "--",
  "—",
  "a definir",
  "adefinir",
  "na",
  "n/a",
  "nao apurado",
  "sem apuracao",
]);

export const PHASES = [
  "Ideia",
  "Análise de Viabilidade",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
  "Parado",
  "Cancelado",
] as const;

const PHASE_NUMBERS: Record<string, number> = {
  ideia: 1,
  "analise de viabilidade": 2,
  analise: 2,
  viabilidade: 2,
  aprovacao: 3,
  planejamento: 4,
  execucao: 5,
  encerramento: 6,
  parado: 9,
  pausado: 9,
  suspenso: 9,
  cancelado: 10,
};

const PHASE_CANONICAL_NAMES: Record<number, string> = {
  1: "Ideia",
  2: "Análise de Viabilidade",
  3: "Aprovação",
  4: "Planejamento",
  5: "Execução",
  6: "Encerramento",
  9: "Parado",
  10: "Cancelado",
};

/** Remove acentos, espaços repetidos e caracteres invisíveis de um texto. */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return formatIsoDate(value);
  }
  return String(value)
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chave de comparação sem acentos e em caixa baixa. */
export function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Chave compacta usada para localizar cabeçalhos pelo NOME, nunca pela posição. */
export function headerKey(value: unknown): string {
  return normalizeKey(value).replace(/[^a-z0-9]/g, "");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.round(serial * 86_400_000));
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Datas do Excel chegam em formatos mistos. Retorna uma data ISO (yyyy-MM-dd)
 * ou null quando o valor representa "A definir", vazio ou algo inválido.
 */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatIsoDate(value);
  }
  if (typeof value === "number") return excelSerialToIso(value);

  const raw = normalizeText(value);
  if (!raw) return null;
  const key = normalizeKey(raw);
  if (EMPTY_DATE_VALUES.has(key) || key.includes("a definir") || key.includes("nao se aplica")) {
    return null;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    return buildIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const brMatch = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+.*)?$/);
  if (brMatch) {
    const first = Number(brMatch[1]);
    const second = Number(brMatch[2]);
    const rawYear = Number(brMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;

    // Prioriza o padrão brasileiro (dd/mm). Só inverte quando o 2º bloco
    // claramente representa o dia (ex.: 08/27/2026 vindo de um Excel en-US).
    const dayFirst = first > 12 ? true : second > 12 ? false : true;
    return dayFirst
      ? buildIsoDate(year, second, first)
      : buildIsoDate(year, first, second);
  }

  // Último recurso: formatos textuais reconhecidos nativamente (ex.: Aug 24, 2026).
  if (/[a-zA-Z]/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return formatIsoDate(parsed);
  }

  return null;
}

/** Converte a string ISO devolvida por normalizeDate em um Date local seguro. */
export function isoToDate(value: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Normaliza SIM / NÃO / N/A / A definir em uma chave previsível. */
export function normalizeBinary(value: unknown): BinaryStatus {
  if (typeof value === "boolean") return value ? "SIM" : "NAO";
  const key = normalizeKey(value);
  if (!key || key === "adefinir" || key === "definir" || key.includes("pendente")) {
    return "A_DEFINIR";
  }
  if (
    key === "na" ||
    key === "n/a" ||
    key.includes("se aplica") ||
    key.includes("aplicavel") ||
    key.includes("nao aplica")
  ) {
    return "NA";
  }
  if (key === "sim" || key === "s" || key === "true" || key.startsWith("sim ")) return "SIM";
  if (key === "nao" || key === "n" || key === "false" || key.startsWith("nao ")) return "NAO";
  if (key.startsWith("sim")) return "SIM";
  if (key.startsWith("nao")) return "NAO";
  return "A_DEFINIR";
}

/** Converte 0,738 | "73,8%" | "100%" em um decimal entre 0 e 1. */
export function normalizePercent(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return clampPercent(value > 1 ? value / 100 : value);
  }

  const raw = normalizeText(value);
  if (!raw) return null;
  const key = normalizeKey(raw);
  if (INVALID_PERCENT_VALUES.has(key)) return null;

  const hasPercentSign = raw.includes("%");
  let numeric = raw.replace(/\s/g, "").replace("%", "");
  if (numeric.includes(",") && numeric.includes(".")) {
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    numeric =
      lastComma > lastDot
        ? numeric.replace(/\./g, "").replace(",", ".")
        : numeric.replace(/,/g, "");
  } else {
    numeric = numeric.replace(",", ".");
  }

  const match = numeric.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed)) return null;

  if (hasPercentSign) return clampPercent(parsed / 100);
  return clampPercent(parsed > 1 ? parsed / 100 : parsed);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** Normaliza "5.Execução", "10. Cancelado" ou "Execução" em ordem + nome. */
export function normalizeFase(value: unknown): ParsedFase {
  const raw = normalizeText(value);
  if (!raw) return { ordem: 0, nome: "" };

  const numbered = raw.match(/^(\d+)\s*[.)\-:]?\s*(.*)$/);
  const declaredOrder = numbered ? Number(numbered[1]) : undefined;
  const namePart = numbered ? numbered[2] || raw : raw;
  const key = normalizeKey(namePart);
  const canonicalOrder = PHASE_NUMBERS[key];

  if (canonicalOrder) {
    return {
      ordem: canonicalOrder,
      nome: PHASE_CANONICAL_NAMES[canonicalOrder] ?? titleFromKey(key),
    };
  }

  return {
    ordem: declaredOrder && Number.isFinite(declaredOrder) ? declaredOrder : 0,
    nome: namePart || raw,
  };
}

function titleFromKey(key: string): string {
  return key
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Mapeia o texto da coluna Status para as chaves internas do portal. */
export function normalizeStatusKey(value: unknown): StatusKey | null {
  const key = normalizeKey(value);
  if (!key) return null;
  if (key.includes("atras")) return "atrasado";
  if (key.includes("atencao") || key === "risco" || key.includes("amarelo")) return "em_atencao";
  if (key.includes("sem apuracao") || key.includes("nao apurad") || key.includes("cinza")) {
    return "sem_apuracao";
  }
  if (key.includes("parado") || key.includes("pausad") || key.includes("suspens")) return "parado";
  if (
    key.includes("encerr") ||
    key.includes("conclu") ||
    key.includes("finaliz") ||
    key.includes("cancel")
  ) {
    return "encerrado";
  }
  if (key.includes("no prazo") || key.includes("dentro do prazo") || key.includes("verde")) {
    return "no_prazo";
  }
  return null;
}

/** Extrai "Novembro 2026" de nomes como "... Detalhado Novembro.xlsx". */
export function extractCicloFromFileName(fileName: string): string {
  const key = normalizeKey(fileName);
  const yearMatch = fileName.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  const monthIndex = MONTHS_PT.findIndex((month) => key.includes(normalizeKey(month)));
  if (monthIndex >= 0) return `${MONTHS_PT[monthIndex]} ${year}`;
  return `${MONTHS_PT[new Date().getMonth()]} ${year}`;
}
