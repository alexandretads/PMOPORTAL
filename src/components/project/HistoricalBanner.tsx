import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowLeftRight, Eye, RotateCcw } from "lucide-react";
import type { Project } from "@/types";
import {
  weekInfoForSelection,
  type TemporalHistoryEntry,
  type TimeSelection,
} from "@/lib/calc/timeMachine";
import { formatDateBR } from "@/lib/format";

interface HistoricalBannerProps {
  project: Project;
  view: TimeSelection | "current";
  lastUpdateInWeek: TemporalHistoryEntry | null;
  nearestWeek: TimeSelection | null;
  onJumpToNearest: () => void;
  onResetToCurrent: () => void;
}

function formatUpdateMoment(entry: TemporalHistoryEntry): string {
  const raw = entry.changedAt ?? entry.data;
  const date = parseISO(raw);
  if (!isValid(date)) return formatDateBR(raw, "dd/MM/yyyy");
  return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
}

export function HistoricalBanner({
  view,
  lastUpdateInWeek,
  nearestWeek,
  onJumpToNearest,
  onResetToCurrent,
}: HistoricalBannerProps) {
  if (view === "current") return null;

  const week = weekInfoForSelection(view);
  const range = `${format(parseISO(week.weekStart), "dd/MM")}–${format(
    parseISO(week.weekEnd),
    "dd/MM"
  )} de ${week.year}`;

  if (!lastUpdateInWeek) {
    return (
      <div
        role="status"
        className="mt-4 flex flex-wrap items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900"
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold">
            Projeto sem atualização cadastrada na semana informada.
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900/80">
            Exibindo o último estado conhecido do projeto, em {range}.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {nearestWeek ? (
              <button
                type="button"
                onClick={onJumpToNearest}
                className="inline-flex items-center gap-1.5 rounded-sm border border-amber-300 bg-white/70 px-2.5 py-1 text-[10.5px] font-semibold text-amber-900 transition-colors hover:bg-white"
              >
                <ArrowLeftRight size={11} strokeWidth={2.2} aria-hidden="true" />
                Ir para semana mais próxima com atualização
              </button>
            ) : null}
            <button
              type="button"
              onClick={onResetToCurrent}
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10.5px] font-semibold text-amber-900/80 transition-colors hover:bg-amber-100"
            >
              <RotateCcw size={11} strokeWidth={2.2} aria-hidden="true" />
              Voltar ao estado atual
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-start gap-2.5 rounded-md border border-brand-500 bg-brand-100 px-3.5 py-3 text-brand-900"
    >
      <Eye size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold">Visualizando estado de {range}.</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-brand-900/80">
          Este <strong className="font-semibold">NÃO</strong> é o valor atual do projeto.
        </p>
        <p className="mt-0.5 text-[10.5px] text-brand-900/75">
          Última alteração na semana: {formatUpdateMoment(lastUpdateInWeek)}.
        </p>
        <button
          type="button"
          onClick={onResetToCurrent}
          className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-brand-500/40 bg-white/60 px-2.5 py-1 text-[10.5px] font-semibold text-brand-900 transition-colors hover:bg-white"
        >
          <RotateCcw size={11} strokeWidth={2.2} aria-hidden="true" />
          Voltar ao estado atual
        </button>
      </div>
    </div>
  );
}
