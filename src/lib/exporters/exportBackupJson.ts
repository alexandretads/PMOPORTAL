import type { ChangeLogRecord, PlannerSnapshot, PortfolioSnapshot, Project } from "@/types";

export const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * Snapshot portátil do portfólio. É o mesmo payload que será gravado no
 * Supabase (projects + change_logs + planner_snapshots) e permite restaurar a
 * aplicação em outra máquina sem depender do Excel original.
 */
export function buildPortfolioSnapshot(input: {
  projects: Project[];
  changeLogs: ChangeLogRecord[];
  plannerSnapshots: PlannerSnapshot[];
}): PortfolioSnapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: input.projects.map((project) => ({
      ...project,
      tarefasPriorizadas: [...(project.tarefasPriorizadas ?? [])],
      documentos: Object.fromEntries(
        Object.entries(project.documentos ?? {}).map(([key, document]) => [key, { ...document }])
      ),
    })),
    changeLogs: input.changeLogs.map((log) => ({ ...log, changes: [...log.changes] })),
    plannerSnapshots: input.plannerSnapshots.map((snapshot) => ({ ...snapshot })),
  };
}

/** Valida minimamente um arquivo importado antes de tocar no store. */
export function isPortfolioSnapshot(value: unknown): value is PortfolioSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (
    !Array.isArray(candidate.projects) ||
    candidate.projects.length === 0 ||
    !Array.isArray(candidate.changeLogs) ||
    !Array.isArray(candidate.plannerSnapshots) ||
    typeof candidate.exportedAt !== "string"
  ) {
    return false;
  }
  // Rejeita null/números/textos e itens sem identidade antes de tocar no store.
  return candidate.projects.every((project) => {
    if (typeof project !== "object" || project === null) return false;
    const record = project as Record<string, unknown>;
    return typeof record.id === "string" ? record.id.trim().length > 0 : false;
  });
}

export function downloadPortfolioSnapshot(snapshot: PortfolioSnapshot): string {
  const date = snapshot.exportedAt.slice(0, 10);
  const fileName = `Snapshot_PMO_${date}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}
