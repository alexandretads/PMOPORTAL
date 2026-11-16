import { useMemo, useState } from "react";
import { ChevronsUpDown, SearchX } from "lucide-react";
import type { Project } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { filterProjects, hasActiveFilters } from "@/lib/filterProjects";
import { STATUS_META } from "@/lib/status";
import { PortfolioFilterBar } from "@/components/ui/PortfolioFilterBar";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

type SortKey = "id" | "nome" | "fase" | "pmo" | "real" | "previsto" | "desvio" | "status";
type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const NUMERIC_SORT_KEYS: SortKey[] = ["id", "real", "previsto", "desvio", "status"];

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={
        isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn("px-4 py-2.5 text-left", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-text",
          isActive ? "text-brand-700" : "text-text2"
        )}
      >
        {label}
        <ChevronsUpDown
          size={11}
          strokeWidth={2}
          className={cn(
            "transition-colors",
            isActive ? "text-brand-700" : "text-text2/40 group-hover:text-text2"
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function sortValue(project: Project, key: SortKey): string | number | null {
  switch (key) {
    case "id":
      return project.id;
    case "nome":
      return project.nome;
    case "fase":
      return project.faseOrdem;
    case "pmo":
      return project.pmo;
    case "real":
      return project.avancoReal;
    case "previsto":
      return project.avancoPrevisto;
    case "desvio":
      return project.avancoReal !== null && project.avancoPrevisto !== null
        ? project.avancoReal - project.avancoPrevisto
        : null;
    case "status":
      return STATUS_META[project.status].order;
    default:
      return project.nome;
  }
}

export function Projects() {
  const projects = usePortfolioStore((state) => state.projects);
  const filters = usePortfolioStore((state) => state.filters);
  const clearFilters = usePortfolioStore((state) => state.clearFilters);
  const [sort, setSort] = useState<SortState>({ key: "id", direction: "asc" });

  const filtered = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sort.key);
      const bValue = sortValue(b, sort.key);

      if (aValue === null && bValue === null) return a.nome.localeCompare(b.nome, "pt-BR");
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      let comparison: number;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), "pt-BR", {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filtered, sort]);

  function handleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: NUMERIC_SORT_KEYS.includes(key) ? "desc" : "asc" }
    );
  }

  const isFiltering = hasActiveFilters(filters);

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              Carteira de projetos
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <h1 className="font-display text-[25px] font-semibold leading-tight tracking-[-0.035em] text-text sm:text-[29px]">
              Projetos
            </h1>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-brand-100 bg-brand-50 px-2 font-display text-[11px] font-semibold tabular-nums text-brand-700">
              {filtered.length}
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] text-text2 sm:text-[12px]">
            Acompanhe avanço, fase e status de cada projeto do portfólio.
          </p>
        </div>

        <p className="hidden items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-[10.5px] font-medium text-text2 shadow-sm sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          Ordenado por{" "}
          <strong className="font-semibold text-text">
            {sort.key === "nome"
              ? "Projeto"
              : sort.key === "fase"
                ? "Fase"
                : sort.key === "pmo"
                  ? "PMO"
                  : sort.key === "real"
                    ? "Real"
                    : sort.key === "previsto"
                      ? "Previsto"
                      : sort.key === "desvio"
                        ? "Desvio"
                        : sort.key === "status"
                          ? "Status"
                          : "ID"}
          </strong>
          <span className="text-text2/60">({sort.direction === "asc" ? "crescente" : "decrescente"})</span>
        </p>
      </header>

      <PortfolioFilterBar includeSearch className="mt-5" />

      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[13px] font-semibold text-text">
              Portfólio de projetos
            </h2>
            <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[9.5px] font-medium tabular-nums text-text2">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
          <p className="text-[10px] text-text2">
            Exibindo {filtered.length} de {projects.length}{" "}
            {projects.length === 1 ? "projeto" : "projetos"}
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={SearchX}
              title="Nenhum projeto encontrado com os filtros atuais"
              description="Ajuste os filtros ou limpe a busca para visualizar novamente todo o portfólio."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-2 rounded-sm bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
                >
                  Limpar filtros
                </button>
              }
              className="border-0 bg-bg/40"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="border-b border-border bg-bg/70">
                <tr>
                  <SortableHeader label="ID" sortKey="id" sort={sort} onSort={handleSort} />
                  <SortableHeader label="Projeto" sortKey="nome" sort={sort} onSort={handleSort} />
                  <SortableHeader
                    label="Fase"
                    sortKey="fase"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  />
                  <SortableHeader
                    label="PMO"
                    sortKey="pmo"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden lg:table-cell"
                  />
                  <SortableHeader label="Real" sortKey="real" sort={sort} onSort={handleSort} />
                  <SortableHeader
                    label="Previsto"
                    sortKey="previsto"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  />
                  <SortableHeader
                    label="Desvio"
                    sortKey="desvio"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden xl:table-cell"
                  />
                  <SortableHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />
                  <th scope="col" className="hidden px-3 py-2.5 text-right md:table-cell">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2">
                      Ação
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((project) => (
                  <ProjectListItem key={project.id} project={project} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <p className="text-[10px] text-text2">
            Clique em uma linha para abrir o projeto.
          </p>
          {isFiltering ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[10px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
            >
              Limpar todos os filtros
            </button>
          ) : (
            <p className="text-[10px] text-text2">Ciclo atual · base do PMO</p>
          )}
        </div>
      </section>
    </div>
  );
}
