import { cn } from "@/utils/cn";

interface ProgressDualProps {
  real: number | null;
  previsto: number | null;
  showLegend?: boolean;
  compact?: boolean;
  className?: string;
}

function toPercent(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value * 100));
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatDelta(real: number | null, previsto: number | null): string {
  if (real === null || previsto === null) return "—";
  const delta = (real - previsto) * 100;
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;
}

export function ProgressDual({
  real,
  previsto,
  showLegend = true,
  compact = false,
  className,
}: ProgressDualProps) {
  const realPercent = toPercent(real);
  const previstoPercent = toPercent(previsto);
  const delta = real !== null && previsto !== null ? (real - previsto) * 100 : null;
  const hasValues = realPercent !== null || previstoPercent !== null;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-slate-100",
          compact ? "h-1.5" : "h-2"
        )}
        role="img"
        aria-label={`Avanço real ${formatPercent(real)}; avanço previsto ${formatPercent(previsto)}`}
      >
        {hasValues ? (
          <>
            {previstoPercent !== null ? (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-slate-400/40"
                style={{ width: `${previstoPercent}%` }}
              />
            ) : null}
            {realPercent !== null ? (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                style={{ width: `${realPercent}%` }}
              />
            ) : null}
            {previstoPercent !== null ? (
              <span
                className="absolute inset-y-0 w-[2px] rounded-full bg-text2/70"
                style={{ left: `calc(${previstoPercent}% - 1px)` }}
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : (
          <div className="h-full w-full rounded-full bg-slate-100" />
        )}
      </div>

      {showLegend ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text2">
          <span>
            Real <strong className="font-semibold text-text">{formatPercent(real)}</strong>
          </span>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <span>
            Prev <strong className="font-semibold text-text">{formatPercent(previsto)}</strong>
          </span>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <span
            className={cn(
              "font-semibold",
              delta === null ? "text-text2" : delta < 0 ? "text-status-danger" : "text-status-ok"
            )}
          >
            Δ {formatDelta(real, previsto)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
