import { History } from "lucide-react";
import type { Project } from "@/types";
import { formatDateBR } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

interface HistoryCardProps {
  project: Project;
  className?: string;
}

interface HistoryEntry {
  data: string;
  descricao: string;
  origem: string;
}

/**
 * O histórico é opcional no modelo atual. O type guard evita alterar o tipo
 * Project nesta iteração e mantém a UI pronta para quando o campo existir.
 */
type ProjectWithHistory = Project & { historico?: unknown };

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.data === "string" &&
    typeof candidate.descricao === "string" &&
    typeof candidate.origem === "string"
  );
}

function readHistory(project: Project): HistoryEntry[] {
  const candidate = (project as ProjectWithHistory).historico;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter(isHistoryEntry);
}

export function HistoryCard({ project, className }: HistoryCardProps) {
  const history = readHistory(project).sort((a, b) => b.data.localeCompare(a.data));

  return (
    <section
      id="history-card"
      aria-labelledby="history-title"
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="history-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <History size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Histórico de atualizações
          </h2>
          <p className="mt-1 text-[11.5px] text-text2">
            Registros do acompanhamento do projeto no ciclo atual.
          </p>
        </div>
        {history.length > 0 ? (
          <span className="inline-flex h-7 items-center rounded-full border border-border bg-bg px-2.5 text-[10px] font-semibold tabular-nums text-text2">
            {history.length} {history.length === 1 ? "registro" : "registros"}
          </span>
        ) : null}
      </header>

      <div className="mt-4">
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sem atualizações registradas neste ciclo"
            className="border-0 bg-bg/40 px-4 py-5 [&>h3]:mt-2.5 [&>h3]:text-[13.5px] [&>h3]:font-medium [&>h3]:text-text2 [&>span]:h-10 [&>span]:w-10 [&>span>svg]:h-[18px] [&>span>svg]:w-[18px]"
          />
        ) : (
          <ol className="divide-y divide-border">
            {history.map((entry, index) => (
              <li
                key={`${entry.data}-${index}`}
                className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4"
              >
                <span className="shrink-0 pt-0.5 font-mono text-[10.5px] font-medium tabular-nums text-text2">
                  {formatDateBR(entry.data)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-relaxed text-text">{entry.descricao}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-text2">
                    {entry.origem}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
