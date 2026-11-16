import type { StatusKey } from "@/types";

export interface StatusMeta {
  label: string;
  shortLabel: string;
  emoji: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
  softBg: string;
  bar: string;
  hex: string;
  order: number;
}

export const STATUS_META: Record<StatusKey, StatusMeta> = {
  no_prazo: {
    label: "NO PRAZO",
    shortLabel: "No prazo",
    emoji: "🟢",
    dot: "bg-status-ok",
    text: "text-status-ok",
    bg: "bg-status-ok/10",
    border: "border-status-ok/20",
    softBg: "bg-status-ok/5",
    bar: "bg-status-ok",
    hex: "#059669",
    order: 1,
  },
  em_atencao: {
    label: "EM ATENÇÃO",
    shortLabel: "Em atenção",
    emoji: "🟡",
    dot: "bg-status-warn",
    text: "text-status-warn",
    bg: "bg-status-warn/10",
    border: "border-status-warn/20",
    softBg: "bg-status-warn/5",
    bar: "bg-status-warn",
    hex: "#D97706",
    order: 2,
  },
  atrasado: {
    label: "ATRASADO",
    shortLabel: "Atrasado",
    emoji: "🔴",
    dot: "bg-status-danger",
    text: "text-status-danger",
    bg: "bg-status-danger/10",
    border: "border-status-danger/20",
    softBg: "bg-status-danger/5",
    bar: "bg-status-danger",
    hex: "#DC2626",
    order: 3,
  },
  sem_apuracao: {
    label: "SEM APURAÇÃO",
    shortLabel: "Sem apuração",
    emoji: "⚪",
    dot: "bg-status-muted",
    text: "text-text2",
    bg: "bg-status-muted/10",
    border: "border-status-muted/20",
    softBg: "bg-status-muted/5",
    bar: "bg-status-muted",
    hex: "#94A3B8",
    order: 4,
  },
  parado: {
    label: "PARADO",
    shortLabel: "Parado",
    emoji: "⏸",
    dot: "bg-status-paused",
    text: "text-status-paused",
    bg: "bg-status-paused/10",
    border: "border-status-paused/20",
    softBg: "bg-status-paused/5",
    bar: "bg-status-paused",
    hex: "#7C3AED",
    order: 5,
  },
  encerrado: {
    label: "ENCERRADO",
    shortLabel: "Encerrado",
    emoji: "✅",
    dot: "bg-status-done",
    text: "text-status-done",
    bg: "bg-status-done/10",
    border: "border-status-done/20",
    softBg: "bg-status-done/5",
    bar: "bg-status-done",
    hex: "#0891B2",
    order: 6,
  },
};

export const STATUS_ORDER: StatusKey[] = [
  "no_prazo",
  "em_atencao",
  "atrasado",
  "sem_apuracao",
  "parado",
  "encerrado",
];

export const ATTENTION_STATUSES: StatusKey[] = ["atrasado", "em_atencao", "sem_apuracao"];
