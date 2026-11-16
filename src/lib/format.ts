import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatPercent(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits })}%`;
}

export function formatDelta(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const points = value * 100;
  return `${points > 0 ? "+" : ""}${points.toLocaleString("pt-BR", {
    maximumFractionDigits,
  })} p.p.`;
}

export function formatDateBR(
  value: Date | string | null | undefined,
  pattern = "dd/MM/yyyy"
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) return "—";
  return format(date, pattern, { locale: ptBR });
}

export function formatDateTimeBR(value: Date | string | null | undefined): string {
  return formatDateBR(value, "dd/MM/yyyy 'às' HH:mm");
}

export function formatHours(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
