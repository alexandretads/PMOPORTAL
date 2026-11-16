import type { Project } from "@/types";
import { formatDateBR } from "@/lib/format";
import { InfoChip } from "@/components/ui/InfoChip";

interface InfoChipsRowProps {
  project: Project;
}

function valueOrDash(value: string): string {
  return value.trim() || "—";
}

export function InfoChipsRow({ project }: InfoChipsRowProps) {
  const inicio = project.previsaoGoLive
    ? formatDateBR(project.previsaoGoLive)
    : "A definir";
  const goLive = project.previsaoGoLive
    ? formatDateBR(project.previsaoGoLive)
    : "A definir";

  return (
    <section
      aria-label="Informações do projeto"
      className="mt-4 rounded-lg border border-border bg-surface px-4 py-4 shadow-sm sm:px-5"
    >
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-6">
        <InfoChip
          label="Sponsor"
          value={<span title={project.sponsor}>{valueOrDash(project.sponsor)}</span>}
        />
        <InfoChip
          label="Líder"
          value={<span title={project.lider}>{valueOrDash(project.lider)}</span>}
        />
        <InfoChip label="PMO" value={valueOrDash(project.pmo)} />
        <InfoChip label="Fase" value={valueOrDash(project.fase)} />
        <InfoChip label="Início" value={inicio} />
        <InfoChip label="Go-live" value={goLive} />
      </div>
    </section>
  );
}
