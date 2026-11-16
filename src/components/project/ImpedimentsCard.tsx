import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Project } from "@/types";
import { cn } from "@/utils/cn";

interface ImpedimentsCardProps {
  project: Project;
  className?: string;
}

export function ImpedimentsCard({ project, className }: ImpedimentsCardProps) {
  const impediments = project.impedimentos.trim();
  const hasImpediments = impediments.length > 0;

  return (
    <section
      aria-labelledby="impediments-title"
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="impediments-title"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text2"
        >
          Impedimentos
        </h2>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-sm",
            hasImpediments
              ? "bg-status-warn/10 text-status-warn"
              : "bg-status-ok/10 text-status-ok"
          )}
          aria-hidden="true"
        >
          {hasImpediments ? (
            <AlertTriangle size={14} strokeWidth={1.9} />
          ) : (
            <CheckCircle2 size={14} strokeWidth={1.9} />
          )}
        </span>
      </header>

      <div className="mt-3 flex-1">
        {hasImpediments ? (
          <div className="flex gap-2.5">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-warn"
              aria-hidden="true"
            />
            <p className="whitespace-pre-line text-[13px] leading-[1.7] text-text">
              {impediments}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-sm border border-status-ok/15 bg-status-ok/[0.045] px-3 py-2.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-ok"
              aria-hidden="true"
            />
            <p className="text-[11.5px] font-medium leading-relaxed text-text2">
              Nenhum impedimento registrado.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
