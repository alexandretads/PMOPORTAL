import { Link } from "react-router-dom";
import { ArrowLeft, Info, Lock } from "lucide-react";
import type { Project } from "@/types";
import { formatDateBR } from "@/lib/format";

interface UpdateHeaderProps {
  project: Project;
}

export function UpdateHeader({ project }: UpdateHeaderProps) {
  return (
    <header>
      <Link
        to={`/projetos/${project.id}`}
        className="group inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-text2 transition-colors hover:text-brand-700"
      >
        <ArrowLeft
          size={13}
          strokeWidth={2.2}
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        Voltar ao projeto
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              Painel de atualização
            </p>
          </div>
          <h1 className="mt-2 max-w-4xl font-display text-[22px] font-bold leading-[1.2] tracking-[-0.035em] text-text sm:text-[24px]">
            Atualizar Status
            <span className="font-semibold text-text2"> · </span>
            <span>{project.nome}</span>
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-text2 sm:text-[13px]">
            <span>ID {project.id}</span>
            <span className="text-border" aria-hidden="true">
              ·
            </span>
            <span>
              Última atualização Planner:{" "}
              <strong className="font-medium text-text">
                {project.ultimaAtualizacaoPlanner
                  ? formatDateBR(project.ultimaAtualizacaoPlanner)
                  : "N/I"}
              </strong>
            </span>
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-700">
          <Lock size={10} strokeWidth={2.2} aria-hidden="true" />
          Somente proposta
        </span>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-brand-100 p-3 text-brand-900">
        <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[11.5px] leading-relaxed sm:text-[12px]">
          Este painel não altera o arquivo original. Ele propõe alterações no site e gera um
          prompt para o Copilot do Excel.
        </p>
      </div>
    </header>
  );
}
