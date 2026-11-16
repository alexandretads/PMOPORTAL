import { ListChecks } from "lucide-react";
import type { Project } from "@/types";
import { cn } from "@/utils/cn";

interface PriorityTasksCardProps {
  project: Project;
  className?: string;
}

export function PriorityTasksCard({ project, className }: PriorityTasksCardProps) {
  const tasks = project.tarefasPriorizadas
    .map((task) => task.trim())
    .filter((task) => task.length > 0);

  return (
    <section
      aria-labelledby="priority-tasks-title"
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="priority-tasks-title"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text2"
        >
          Tarefas críticas
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2 py-1 text-[9.5px] font-semibold tabular-nums text-text2">
          <ListChecks size={11} strokeWidth={2} aria-hidden="true" />
          {tasks.length}/5
        </span>
      </header>

      <div className="mt-3 flex-1">
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-[72px] items-center justify-center rounded-sm border border-dashed border-border bg-bg/50 px-4 py-5 text-center">
            <p className="text-[11.5px] leading-relaxed text-text2">
              Nenhuma tarefa priorizada registrada.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border/70">
            {tasks.map((task, index) => (
              <li key={`${task}-${index}`} className="flex items-start gap-2.5 py-2.5 first:pt-0.5">
                <span
                  className="mt-[3px] w-4 shrink-0 text-right font-mono text-[9.5px] font-semibold tabular-nums text-text2/70"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 ring-2 ring-brand-500/10"
                  aria-hidden="true"
                />
                <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed text-text">
                  {task}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
