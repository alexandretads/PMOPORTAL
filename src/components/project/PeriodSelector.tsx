import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, Clock3, RotateCcw, X } from "lucide-react";
import type { Project } from "@/types";
import { formatWeekLabel, listWeeksForMonth } from "@/lib/calc/weekCalendar";
import {
  projectHistory,
  weekInfoForSelection,
  type TimeSelection,
} from "@/lib/calc/timeMachine";
import { cn } from "@/utils/cn";

interface PeriodSelectorProps {
  project: Project;
  value: TimeSelection | "current";
  onChange: (value: TimeSelection | "current") => void;
}

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface PeriodIndex {
  years: number[];
  monthsByYear: Map<number, Set<number>>;
  latestYear: number | null;
  latestMonth: number | null;
}

function buildPeriodIndex(project: Project): PeriodIndex {
  const monthsByYear = new Map<number, Set<number>>();
  let latest: { year: number; month: number } | null = null;

  for (const entry of projectHistory(project)) {
    if (!Number.isFinite(entry.year) || !Number.isFinite(entry.month)) continue;
    if (entry.month < 1 || entry.month > 12) continue;
    const months = monthsByYear.get(entry.year) ?? new Set<number>();
    months.add(entry.month);
    monthsByYear.set(entry.year, months);

    if (!latest || entry.year > latest.year || (entry.year === latest.year && entry.month > latest.month)) {
      latest = { year: entry.year, month: entry.month };
    }
  }

  return {
    years: Array.from(monthsByYear.keys()).sort((a, b) => b - a),
    monthsByYear,
    latestYear: latest?.year ?? null,
    latestMonth: latest?.month ?? null,
  };
}

function latestYearForMonth(index: PeriodIndex, month: number): number | null {
  return index.years.find((year) => index.monthsByYear.get(year)?.has(month)) ?? null;
}

function monthLabel(month: number): string {
  return MONTHS_SHORT[month - 1] ?? String(month);
}

export function PeriodSelector({ project, value, onChange }: PeriodSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [panelYear, setPanelYear] = useState<number | null>(null);
  const [panelMonth, setPanelMonth] = useState<number | null>(null);
  const [stickyTop, setStickyTop] = useState(64);
  const [anchor, setAnchor] = useState({ top: 96, right: 16 });
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildPeriodIndex(project), [project]);
  const hasHistory = index.years.length > 0;
  const selectedWeek = value === "current" ? null : weekInfoForSelection(value);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    function sync() {
      setIsDesktop(query.matches);
    }
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!expanded || !isDesktop) return;
    function updateAnchor() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: Math.round(rect.bottom + 8),
        right: Math.max(16, Math.round(window.innerWidth - rect.right)),
      });
    }
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    return () => window.removeEventListener("resize", updateAnchor);
  }, [expanded, isDesktop]);

  useEffect(() => {
    if (!expanded) return;

    if (value !== "current") {
      setPanelYear(value.year);
      setPanelMonth(value.month);
      return;
    }

    setPanelYear(index.latestYear);
    setPanelMonth(index.latestMonth);
  }, [expanded, value, index.latestYear, index.latestMonth]);

  const updateOffset = useCallback(() => {
    const topbar = document.querySelector("header");
    const main = containerRef.current?.closest("main");
    const sibling = main?.previousElementSibling ?? null;
    const topbarHeight = topbar?.getBoundingClientRect().height ?? 64;
    const bannerHeight =
      sibling instanceof HTMLElement && sibling.tagName !== "HEADER"
        ? sibling.getBoundingClientRect().height
        : 0;
    setStickyTop(Math.round(topbarHeight + bannerHeight));
  }, []);

  useEffect(() => {
    updateOffset();
    const topbar = document.querySelector("header");
    const main = containerRef.current?.closest("main");
    const sibling = main?.previousElementSibling;
    const observer = new ResizeObserver(updateOffset);
    if (topbar instanceof HTMLElement) observer.observe(topbar);
    if (sibling instanceof HTMLElement) observer.observe(sibling);
    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, [updateOffset]);

  useEffect(() => {
    if (!expanded) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [expanded]);

  const monthsAvailable = useMemo(() => {
    if (panelYear === null) {
      const union = new Set<number>();
      index.monthsByYear.forEach((months) => months.forEach((month) => union.add(month)));
      return union;
    }
    return index.monthsByYear.get(panelYear) ?? new Set<number>();
  }, [index, panelYear]);

  const weeksYear = panelYear ?? (panelMonth ? latestYearForMonth(index, panelMonth) : null);
  const weeks =
    weeksYear !== null && panelMonth !== null
      ? listWeeksForMonth(weeksYear, panelMonth)
      : [];

  const mainLabel =
    value === "current" || !selectedWeek
      ? "Atual"
      : `S${selectedWeek.week} · ${format(parseISO(selectedWeek.weekStart), "dd/MM")} – ${format(
          parseISO(selectedWeek.weekEnd),
          "dd/MM"
        )} · ${monthLabel(selectedWeek.month)}/${selectedWeek.year}`;

  function selectWeek(selection: TimeSelection) {
    onChange(selection);
    setExpanded(false);
  }

  function reset() {
    onChange("current");
    setExpanded(false);
  }

  return (
    <>
      {expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] bg-brand-900/45 backdrop-blur-[1px] md:hidden"
              onClick={() => setExpanded(false)}
              aria-hidden="true"
            />,
            document.body
          )
        : null}

      <div
        ref={containerRef}
        data-period-selector
        style={{ top: stickyTop }}
        className="sticky z-20 mt-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
              <CalendarDays size={12} strokeWidth={2} className="text-brand-700" aria-hidden="true" />
              Visualizando
            </span>

            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-haspopup="dialog"
              aria-label="Selecionar período de visualização"
              className={cn(
                "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                value === "current"
                  ? "border-brand-100 bg-brand-100 text-brand-900 hover:bg-brand-100/80"
                  : "border-brand-500/30 bg-brand-50 text-brand-700 hover:border-brand-500/50"
              )}
            >
              <span className="max-w-[210px] truncate">{mainLabel}</span>
              <ChevronDown
                size={12}
                strokeWidth={2.4}
                aria-hidden="true"
                className={cn("shrink-0 transition-transform", expanded && "rotate-180")}
              />
            </button>

            {selectedWeek ? (
              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-text2">
                <Clock3 size={11} strokeWidth={2} aria-hidden="true" />
                {formatWeekLabel(selectedWeek)} de {selectedWeek.year}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-text2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                Estado atual do projeto
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={reset}
            disabled={value === "current"}
            title="Voltar ao estado atual"
            aria-label="Voltar ao estado atual do projeto"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[10.5px] font-semibold text-text2 transition-colors enabled:hover:border-brand-500/30 enabled:hover:bg-brand-50 enabled:hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Atual</span>
          </button>
        </div>

        {expanded
          ? createPortal(
          <div
            role="dialog"
            aria-label="Selecionar semana do histórico"
            style={isDesktop ? { top: anchor.top, right: anchor.right } : undefined}
            className={cn(
              "fixed z-[100] animate-fade-in overflow-y-auto border border-border bg-surface p-4 shadow-lg",
              isDesktop
                ? "rounded-lg"
                : "inset-x-0 bottom-0 max-h-[82vh] rounded-t-2xl",
              isDesktop && "md:max-h-[70vh] md:w-[min(760px,calc(100vw-2rem))] md:p-5"
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden="true" />
            <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="font-display text-[14px] font-semibold text-text">Selecionar período</h2>
                <p className="mt-0.5 text-[10.5px] text-text2">
                  Semanas úteis de segunda a sexta, pertencentes ao mês da quarta-feira.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border text-text2 transition-colors hover:bg-bg hover:text-text"
                aria-label="Fechar seletor de período"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </header>

            {!hasHistory ? (
              <div
                className={cn(
                  "rounded-md border border-dashed border-border bg-bg/60 px-4 py-6 text-center",
                  isDesktop ? "mt-3 w-full" : "mt-4"
                )}
              >
                <CalendarDays size={22} className="mx-auto text-text2/60" aria-hidden="true" />
                <p className="mt-2 text-[12px] font-semibold text-text">
                  Este projeto não tem histórico de alterações registrado
                </p>
                <p className="mt-1 text-[10.5px] text-text2">
                  Não há semanas passadas disponíveis para navegação.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text2">
                    Anos disponíveis
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPanelYear(null);
                        setPanelMonth(null);
                      }}
                      aria-pressed={panelYear === null}
                      className={cn(
                        "h-7 rounded-full border px-2.5 text-[10.5px] font-semibold transition-colors",
                        panelYear === null
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-border bg-surface text-text2 hover:border-brand-500/40 hover:text-brand-700"
                      )}
                    >
                      Todos
                    </button>
                    {index.years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setPanelYear(year);
                          const months = index.monthsByYear.get(year);
                          setPanelMonth((current) =>
                            current !== null && months?.has(current)
                              ? current
                              : Array.from(months ?? []).sort((a, b) => b - a)[0] ?? null
                          );
                        }}
                        aria-pressed={panelYear === year}
                        className={cn(
                          "h-7 rounded-full border px-2.5 text-[10.5px] font-semibold tabular-nums transition-colors",
                          panelYear === year
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-border bg-surface text-text2 hover:border-brand-500/40 hover:text-brand-700"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text2">
                    Mês
                  </p>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-12">
                    {MONTHS_SHORT.map((month, position) => {
                      const monthNumber = position + 1;
                      const enabled = monthsAvailable.has(monthNumber);
                      return (
                        <button
                          key={month}
                          type="button"
                          disabled={!enabled}
                          onClick={() => {
                            setPanelMonth(monthNumber);
                            if (panelYear === null) {
                              setPanelYear(latestYearForMonth(index, monthNumber));
                            }
                          }}
                          aria-pressed={panelMonth === monthNumber}
                          className={cn(
                            "h-7 rounded-sm border text-[10px] font-semibold transition-colors",
                            panelMonth === monthNumber
                              ? "border-brand-700 bg-brand-700 text-white"
                              : enabled
                                ? "border-border bg-surface text-text2 hover:border-brand-500/40 hover:text-brand-700"
                                : "cursor-not-allowed border-border/60 bg-bg text-text2/35"
                          )}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text2">
                      Semanas de {panelMonth ? monthLabel(panelMonth) : "—"}
                      {weeksYear ? ` / ${weeksYear}` : ""}
                    </p>
                    <p className="text-[9.5px] text-text2">Conteúdo do histórico</p>
                  </div>
                  {panelMonth === null || weeksYear === null ? (
                    <p className="mt-2 text-[11px] text-text2">Escolha um mês com histórico.</p>
                  ) : (
                    <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
                      {weeks.map((week) => {
                        const count = projectHistory(project).filter(
                          (entry) =>
                            entry.year === week.year &&
                            entry.month === week.month &&
                            entry.week === week.week
                        ).length;
                        const isSelected =
                          value !== "current" &&
                          value.year === week.year &&
                          value.month === week.month &&
                          value.week === week.week;

                        return (
                          <button
                            key={`${week.year}-${week.month}-${week.week}`}
                            type="button"
                            onClick={() => selectWeek(week)}
                            aria-pressed={isSelected}
                            className={cn(
                              "flex shrink-0 flex-col items-start gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
                              isSelected
                                ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700"
                                : "border-border bg-surface hover:border-brand-500/40 hover:bg-brand-50/40"
                            )}
                          >
                            <span
                              className={cn(
                                "text-[10.5px] font-semibold",
                                isSelected ? "text-brand-900" : "text-text"
                              )}
                            >
                              {formatWeekLabel(week)}
                            </span>
                            {count > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-100 px-1.5 py-0.5 text-[8.5px] font-semibold tabular-nums text-brand-900">
                                {count} {count === 1 ? "alteração" : "alterações"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-status-warn/20 bg-status-warn/10 px-1.5 py-0.5 text-[8.5px] font-semibold text-status-warn">
                                sem atualização
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>,
          document.body
        )
          : null}
      </div>
    </>
  );
}
