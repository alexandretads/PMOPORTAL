import type { Project } from "@/types";
import { normalizeDate, normalizeKey } from "@/lib/normalize";
import {
  DOCUMENT_SPECS,
  UPDATABLE_FIELDS,
  fieldValuesToPartial,
  normalizeBinaryValue,
  percentFromPrompt,
  type FieldDefinition,
  type FieldValue,
  type FieldValuePair,
} from "@/lib/updateFields";

interface SourceEntry {
  key: string;
  field: FieldDefinition;
}

const PLACEHOLDER_VALUE = /^(?:—|-|--|vazio|\(vazio\)|n\/a|na|a definir|sem informação|não informado)$/i;

function canonical(value: string): string {
  return normalizeKey(value).replace(/[^a-z0-9]/g, "");
}

function sourceAliases(field: FieldDefinition): string[] {
  const aliases = [field.label, field.column];

  if (field.key === "avancoReal") aliases.push("Avanço real", "Real", "Avanço Real (%)");
  if (field.key === "avancoPrevisto") {
    aliases.push("Avanço previsto %", "Previsto", "Avanço Previsto (%)");
  }
  if (field.key === "ultimaAtualizacaoPlanner") {
    aliases.push(
      "Data última atualização do Planner",
      "Última atualização do Planner",
      "Última atualização Planner"
    );
  }
  if (field.key === "previsaoGoLive") aliases.push("Previsão go-live", "Go-live");
  if (field.key.startsWith("tarefasPriorizadas.")) {
    aliases.push(field.label.replace("Priorizada", "Prioritizada"));
  }
  if (field.key.startsWith("documentos.")) {
    const [, documentKey, property] = field.key.split(".");
    const spec = DOCUMENT_SPECS.find((document) => document.key === documentKey);
    if (spec && property === "status") aliases.push(spec.label);
    if (spec && property === "dataSolicitacao") {
      aliases.push(`Data do solicitação ${spec.label}`, ...(spec.requestAliases ?? []));
    }
    if (spec && property === "dataFinalizacao") {
      aliases.push(`Data Finalizado em ${spec.label}`, ...(spec.completionAliases ?? []));
    }
  }

  return aliases;
}

const SOURCE_MAP: Map<string, SourceEntry> = (() => {
  const map = new Map<string, SourceEntry>();
  for (const field of UPDATABLE_FIELDS) {
    for (const alias of sourceAliases(field)) {
      const key = canonical(alias);
      if (key && !map.has(key)) map.set(key, { key: field.key, field });
    }
  }
  return map;
})();

function findField(label: string): SourceEntry | null {
  const clean = label
    .replace(/^[\s\-*•]+/, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  return SOURCE_MAP.get(canonical(clean)) ?? null;
}

function cleanRawValue(raw: string): string {
  let value = raw
    .replace(/^[\s\-*•]+/, "")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  value = value.replace(/\s*\((?:novo|nova|proposto|proposta)\)\s*$/i, "").trim();

  const fromTo = value.match(/\bde\s+.+?\s+(?:para|→|->|=>)\s+(.+)$/i);
  if (fromTo) value = fromTo[1].trim();

  value = value
    .replace(/^["'“”‘’]+/, "")
    .replace(/["'“”‘’]+$/, "")
    .replace(/[.;,]+$/, "")
    .trim();

  return value;
}

function convertValue(field: FieldDefinition, raw: string): FieldValue | undefined {
  const clean = cleanRawValue(raw);
  const isPlaceholder = PLACEHOLDER_VALUE.test(clean) || clean === "";

  if (field.kind === "percent") {
    if (isPlaceholder) return null;
    return percentFromPrompt(clean);
  }

  if (field.kind === "date") {
    if (isPlaceholder) return null;
    const date = normalizeDate(clean);
    if (date) return date;
    if (/a definir|pendente|sem data|vazio/i.test(clean)) return null;
    return undefined;
  }

  if (field.kind === "status") {
    if (/^(sim|s|não|nao|n|n\/a|na)$/i.test(clean)) {
      return normalizeBinaryValue(clean);
    }
    if (isPlaceholder || /a definir|pendente/i.test(clean)) return "A_DEFINIR";
    return undefined;
  }

  if (isPlaceholder) return "";
  return clean;
}

/**
 * Extrai alterações propostas por um prompt do Atualizador de Status.
 * Aceita blocos "Coluna / Novo valor" e pares inline "Campo: valor".
 * Retorna apenas campos reconhecidos, com valores já normalizados.
 */
export function extractPromptChanges(text: string): FieldValuePair[] {
  if (text.trim().length === 0) return [];

  const source = text
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\*\*/g, "")
    .replace(/`/g, "");

  const extracted = new Map<string, FieldValue>();

  const blockPattern =
    /(?:Coluna|Campo)\s*:\s*([^\n|]+)(?:(?!(?:Coluna|Campo)\s*:)[\s\S])*?Novo valor(?:\s+proposto)?\s*:\s*([^\n|]+)/gi;

  for (const match of source.matchAll(blockPattern)) {
    const entry = findField(match[1]);
    if (!entry) continue;
    const value = convertValue(entry.field, match[2]);
    if (value !== undefined) extracted.set(entry.key, value);
  }

  const lines = source.split("\n");
  for (const line of lines) {
    if (
      /valor\s+(?:anterior|atual)|(?:Coluna|Campo)\s*:/i.test(line) ||
      /^(?:\s*[-*•]?\s*)?(?:novo valor|situação|observação)\s*:/i.test(line)
    ) {
      continue;
    }

    const inline = line.match(/^\s*(?:[-*•]\s*)?(.+?)\s*(?::|→|->|=>)\s*(.+?)\s*$/);
    if (!inline) continue;

    const entry = findField(inline[1]);
    if (!entry) continue;
    const value = convertValue(entry.field, inline[2]);
    if (value !== undefined) extracted.set(entry.key, value);
  }

  return Array.from(extracted.entries()).map(([key, value]) => ({ key, value }));
}

/** Contrato principal do parser. Retorna null quando nada reconhecível é encontrado. */
export function parseAtualizadorPrompt(text: string): Partial<Project> | null {
  const changes = extractPromptChanges(text);
  if (changes.length === 0) return null;
  return fieldValuesToPartial(changes);
}

/** ID mencionado no cabeçalho do prompt, para conferência com a lâmina aberta. */
export function extractPromptProjectId(text: string): string | null {
  const match = text.match(/ID\s+(\d+)/i);
  return match ? match[1] : null;
}
