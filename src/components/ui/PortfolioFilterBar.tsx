import { useMemo } from "react";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { hasActiveFilters } from "@/lib/filterProjects";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { StatusKey } from "@/types";
import { asText } from "@/lib/projectSchema";
import { cn } from "@/utils/cn";

interface PortfolioFilterBarProps {
  includeSearch?: boolean;
  className?: string;
}

export function PortfolioFilterBar({
  includeSearch = false,
  className,
}: PortfolioFilterBarProps) {
  const projects = usePortfolioStore((state) => state.projects);
  const filters = usePortfolioStore((state) => state.filters);
  const setFilter = usePortfolioStore((state) => state.setFilter);
  const clearFilters = usePortfolioStore((state) => state.clearFilters);

  const options = useMemo(() => {
    const tipos = Array.from(
      new Set(projects.map((project) => asText(project.tipo)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const faseMap = new Map<string, number>();
    projects.forEach((project) => {
      const fase = asText(project.fase);
      if (fase) faseMap.set(fase, Number(project.faseOrdem) || 0);
    });
    const fases = Array.from(faseMap.entries())
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "pt-BR"))
      .map(([fase]) => fase);

    const pmos = Array.from(
      new Set(projects.map((project) => asText(project.pmo)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return { tipos, fases, pmos };
  }, [projects]);

  const isFiltering = hasActiveFilters(filters);
  const activeCount = [
    filters.tipo,
    filters.fase,
    filters.pmo,
    filters.status,
    filters.busca.trim() || null,
  ].filter(Boolean).length;

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface p-3 shadow-sm sm:p-3.5",
        className
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        {includeSearch ? (
          <div className="min-w-0 xl:w-[280px]">
            <label
              htmlFor="portfolio-search"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-text2"
            >
              Buscar
            </label>
            <div className="group relative">
              <Search
                size={14}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text2 transition-colors group-focus-within:text-brand-700"
                aria-hidden="true"
              />
              <input
                id="portfolio-search"
                type="search"
                value={filters.busca}
                onChange={(event) => setFilter("busca", event.target.value)}
                placeholder="Nome, ID, líder ou sponsor..."
                className="h-9 w-full rounded-sm border border-border bg-surface pl-9 pr-8 text-[12px] text-text outline-none transition-all placeholder:text-text2/70 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden"
              />
              {filters.busca ? (
                <button
                  type="button"
                  onClick={() => setFilter("busca", "")}
                  className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-text2 transition-colors hover:bg-bg hover:text-text"
                  aria-label="Limpar busca"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
          <FilterSelect
            label="Tipo"
            value={filters.tipo}
            options={options.tipos}
            onChange={(value) => setFilter("tipo", value)}
            allLabel="Todos os tipos"
          />
          <FilterSelect
            label="Fase"
            value={filters.fase}
            options={options.fases}
            onChange={(value) => setFilter("fase", value)}
            allLabel="Todas as fases"
          />
          <FilterSelect
            label="PMO"
            value={filters.pmo}
            options={options.pmos}
            onChange={(value) => setFilter("pmo", value)}
            allLabel="Todos os PMOs"
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUS_ORDER.map((status) => ({
              value: status,
              label: STATUS_META[status].shortLabel,
            }))}
            onChange={(value) =>
              setFilter(
                "status",
                value && STATUS_ORDER.includes(value as StatusKey)
                  ? (value as StatusKey)
                  : null
              )
            }
            allLabel="Todos os status"
          />
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-start xl:pb-0">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bg px-2.5 text-[10.5px] font-medium text-text2 xl:hidden 2xl:inline-flex">
            <SlidersHorizontal size={12} aria-hidden="true" />
            {activeCount === 0
              ? "Sem filtros"
              : `${activeCount} ${activeCount === 1 ? "filtro ativo" : "filtros ativos"}`}
          </span>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!isFiltering}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-[11px] font-semibold text-text2 transition-colors enabled:hover:border-brand-500/30 enabled:hover:bg-brand-50 enabled:hover:text-brand-700 disabled:cursor-default disabled:opacity-45"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
