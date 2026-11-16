import { Link } from "react-router-dom";
import { ArrowLeft, Hash } from "lucide-react";
import type { Project } from "@/types";
import { StatusPill } from "@/components/ui/StatusPill";

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const meta = [
    `ID ${project.id}`,
    project.tipo || null,
    `Fase: ${project.fase || "Não informada"}`,
    project.chamadoTopDesk || null,
  ].filter((item): item is string => Boolean(item));

  return (
    <header>
      <Link
        to="/projetos"
        className="group inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-text2 transition-colors hover:text-brand-700"
      >
        <ArrowLeft
          size={13}
          strokeWidth={2.2}
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        Voltar aos projetos
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            <p className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              <Hash size={9} strokeWidth={2.4} aria-hidden="true" />
              Lâmina do projeto
            </p>
          </div>

          <h1 className="mt-2 max-w-4xl font-display text-[24px] font-bold leading-[1.18] tracking-[-0.035em] text-text sm:text-[28px]">
            {project.nome}
          </h1>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-text2 sm:text-[14px]">
            {meta.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                {index > 0 ? (
                  <span className="text-border" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className={index === 0 ? "font-medium tabular-nums" : undefined}>
                  {item}
                </span>
              </span>
            ))}
          </p>
        </div>

        <div className="shrink-0 sm:pt-1">
          <p className="mb-1.5 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text2">
            Status atual
          </p>
          <StatusPill
            status={project.status}
            className="px-3.5 py-1.5 text-[10.5px] shadow-sm sm:text-[11px]"
          />
        </div>
      </div>
    </header>
  );
}
