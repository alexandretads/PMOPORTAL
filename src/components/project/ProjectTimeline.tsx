import { Check, Circle } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Stepper de fases do projeto — componente puramente visual.
 * - verde: fase registrada em `timeline`
 * - azul:  `currentFase`
 * - cinza: fases futuras
 */
export interface TimelineEntry {
  fase: string;
  data: string;
  [key: string]: any;
}

interface ProjectTimelineProps {
  timeline?: TimelineEntry[] | null;
  currentFase?: string | null;
  className?: string;
}

interface StepDefinition {
  key: string;
  label: string;
  aliases: string[];
}

const STEPS: StepDefinition[] = [
  { key: "ideia", label: "Ideia", aliases: ["ideia", "1ideia", "01ideia"] },
  {
    key: "analise",
    label: "Análise",
    aliases: ["analise", "analisedeviabilidade", "viabilidade", "2analise"],
  },
  {
    key: "aprovacao",
    label: "Aprovação",
    aliases: ["aprovacao", "3aprovacao"],
  },
  {
    key: "planejamento",
    label: "Planejamento",
    aliases: ["planejamento", "4planejamento"],
  },
  {
    key: "execucao",
    label: "Execução",
    aliases: ["execucao", "5execucao", "emexecucao"],
  },
  {
    key: "encerramento",
    label: "Encerramento",
    aliases: ["encerramento", "6encerramento", "encerrado", "concluido"],
  },
];

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function stepKey(value: unknown): string | null {
  const key = fold(value);
  if (!key) return null;
  return STEPS.find((step) => step.aliases.includes(key))?.key ?? null;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return value.trim();
}

export function ProjectTimeline({
  timeline,
  currentFase,
  className,
}: ProjectTimelineProps) {
  const entries = Array.isArray(timeline) ? timeline.filter(Boolean) : [];
  const currentKey = stepKey(currentFase);
  const currentIndex = currentKey ? STEPS.findIndex((step) => step.key === currentKey) : -1;

  const byKey = new Map<string, TimelineEntry>();
  for (const entry of entries) {
    const key = stepKey(entry?.fase);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, entry);
  }

  const currentOutsideFlow =
    typeof currentFase === "string" &&
    currentFase.trim().length > 0 &&
    currentKey === null;

  return (
    <section
      className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6", className)}
      aria-label="Linha do tempo de fases do projeto"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[14px] font-semibold tracking-[-0.02em] text-text">
            Linha do tempo
          </h3>
          <p className="mt-0.5 text-[10.5px] text-text2">
            Ideia → Encerramento · fases registradas e fase atual
          </p>
        </div>
        {currentFase ? (
          <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-sky-700">
            <Circle size={7} fill="currentColor" aria-hidden="true" />
            <span className="truncate">Atual: {currentFase}</span>
          </span>
        ) : null}
      </header>

      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-[720px] items-start gap-0">
          {STEPS.map((step, index) => {
            const entry = byKey.get(step.key);
            const isCurrent = currentKey === step.key;
            const isDone = !isCurrent && Boolean(entry);
            const isPast = currentIndex >= 0 && index < currentIndex;
            const connectorDone = index < STEPS.length - 1 && (isDone || isCurrent || isPast);
            const date = formatDate(entry?.data);

            return (
              <li
                key={step.key}
                className="flex min-w-0 flex-1 flex-col items-center px-1 text-center"
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-[2px] flex-1 rounded-full",
                      index === 0 ? "opacity-0" : connectorDone ? "bg-emerald-400" : "bg-slate-200"
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                      isCurrent
                        ? "border-sky-600 bg-sky-600 text-white shadow-[0_0_0_4px_rgba(2,132,199,0.14)]"
                        : isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                    )}
                    title={
                      isCurrent
                        ? `${step.label} (fase atual)`
                        : isDone
                          ? `${step.label} concluída${date ? ` em ${date}` : ""}`
                          : `${step.label} pendente`
                    }
                  >
                    {isDone ? (
                      <Check size={14} strokeWidth={1.9} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "h-[2px] flex-1 rounded-full",
                      index === STEPS.length - 1
                        ? "opacity-0"
                        : connectorDone
                          ? "bg-emerald-400"
                          : "bg-slate-200"
                    )}
                    aria-hidden="true"
                  />
                </div>

                <span
                  className={cn(
                    "mt-2 max-w-[104px] text-[10.5px] font-semibold leading-tight",
                    isCurrent ? "text-sky-700" : isDone ? "text-text" : "text-text2"
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 h-4 text-[9px] tabular-nums text-text2">
                  {date ?? ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {currentOutsideFlow ? (
        <p className="mt-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-text2">
          A fase atual informada é <strong className="font-semibold text-text">{currentFase}</strong>,
          que está fora do fluxo padrão (por exemplo, Parado ou Cancelado).
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-2 text-[10.5px] text-text2">
          Nenhuma fase com data registrada até o momento.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 text-[9.5px] text-text2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Registrada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-600" aria-hidden="true" />
          Fase atual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
          Futura
        </span>
      </div>
    </section>
  );
}

export default ProjectTimeline;
