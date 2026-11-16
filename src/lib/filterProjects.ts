import type { PortfolioFilters, Project } from "@/types";
import { normalizeKey } from "@/lib/normalize";

export function filterProjects(projects: Project[], filters: PortfolioFilters): Project[] {
  const busca = normalizeKey(filters.busca);

  return projects.filter((project) => {
    if (filters.tipo && project.tipo !== filters.tipo) return false;
    if (filters.fase && project.fase !== filters.fase) return false;
    if (filters.pmo && project.pmo !== filters.pmo) return false;
    if (filters.status && project.status !== filters.status) return false;

    if (busca) {
      const searchable = normalizeKey(
        [
          project.id,
          project.nome,
          project.lider,
          project.sponsor,
          project.pmo,
          project.tipo,
          project.fase,
        ].join(" ")
      );
      if (!searchable.includes(busca)) return false;
    }

    return true;
  });
}

export function hasActiveFilters(filters: PortfolioFilters): boolean {
  return Boolean(
    filters.tipo ||
      filters.fase ||
      filters.pmo ||
      filters.status ||
      filters.busca.trim().length > 0
  );
}
