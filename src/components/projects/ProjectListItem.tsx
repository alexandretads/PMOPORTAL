import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Project } from "@/types";
import { STATUS_META } from "@/lib/status";
import { formatDelta, formatPercent, initials } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/utils/cn";

interface ProjectListItemProps {
  project: Project;
}

function MiniBar({ value, tone }: { value: number | null; tone: "real" | "forecast" }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value * 100));
  return (
    <span className="mt-1.5 block h-1 w-full max-w-[76px] overflow-hidden rounded-full bg-slate-100">
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "real" ? "bg-brand-500" : "bg-slate-400/60"
        )}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  const navigate = useNavigate();
  const meta = STATUS_META[project.status];
  const valueTone =
    project.avancoReal === null || project.avancoPrevisto === null
      ? "text-text2"
      : project.avancoReal - project.avancoPrevisto < 0
        ? "text-status-danger"
        : project.avancoReal - project.avancoPrevisto > 0
          ? "text-status-ok"
          : "text-text2";

  function openProject() {
    navigate(`/projetos/${encodeURIComponent(project.id)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject();
    }
  }

  return (
    <tr
      onClick={openProject}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Abrir projeto ${project.nome}`}
      className={cn(
        "group cursor-pointer border-b border-border/80 transition-colors last:border-b-0 hover:bg-brand-50/60 focus-visible:bg-brand-50 focus-visible:outline-none",
        meta.softBg
      )}
    >
      <td className="px-4 py-3.5 align-middle">
        <span className="inline-flex min-w-7 items-center justify-center rounded-[6px] border border-border bg-surface px-1.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-text2 shadow-sm">
          {project.id}
        </span>
      </td>

      <td className="min-w-[230px] max-w-[300px] px-4 py-3.5 align-middle">
        <p className="truncate text-[12.5px] font-semibold leading-snug text-text">{project.nome}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-text2">
          {project.tipo || "Sem tipo"}
          {project.lider ? ` · ${project.lider}` : ""}
        </p>
      </td>

      <td className="hidden whitespace-nowrap px-4 py-3.5 align-middle md:table-cell">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-text">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          {project.fase || "—"}
        </span>
      </td>

      <td className="hidden whitespace-nowrap px-4 py-3.5 align-middle lg:table-cell">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[8.5px] font-semibold text-brand-900">
            {initials(project.pmo || project.lider)}
          </span>
          <span className="text-[11.5px] font-medium text-text">{project.pmo || "—"}</span>
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <span
          className={cn(
            "font-display text-[12px] font-semibold tabular-nums",
            project.avancoReal === null ? "text-text2" : "text-text"
          )}
        >
          {formatPercent(project.avancoReal)}
        </span>
        <MiniBar value={project.avancoReal} tone="real" />
      </td>

      <td className="hidden whitespace-nowrap px-4 py-3.5 align-middle sm:table-cell">
        <span
          className={cn(
            "font-display text-[12px] font-semibold tabular-nums",
            project.avancoPrevisto === null ? "text-text2" : "text-text"
          )}
        >
          {formatPercent(project.avancoPrevisto)}
        </span>
        <MiniBar value={project.avancoPrevisto} tone="forecast" />
      </td>

      <td className={cn("hidden whitespace-nowrap px-4 py-3.5 align-middle text-[11.5px] font-semibold tabular-nums xl:table-cell", valueTone)}>
        {project.avancoReal !== null && project.avancoPrevisto !== null
          ? formatDelta(project.avancoReal - project.avancoPrevisto)
          : "—"}
      </td>

      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
        <StatusPill status={project.status} compact />
      </td>

      <td className="hidden whitespace-nowrap px-3 py-3.5 text-right align-middle md:table-cell">
        <span className="inline-flex items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-[11px] font-semibold text-brand-700 opacity-0 transition-all group-hover:border-brand-100 group-hover:bg-surface group-hover:opacity-100 group-focus-visible:border-brand-100 group-focus-visible:bg-surface group-focus-visible:opacity-100">
          Abrir
          <ArrowRight size={12} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </td>
    </tr>
  );
}
