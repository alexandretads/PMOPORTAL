import type {
  ChangeLogRecord,
  PlannerSnapshot,
  PortfolioSnapshot,
  Project,
} from "@/types";

/**
 * Contrato de persistência. Hoje existe um adaptador em memória; amanhã o
 * adaptador Supabase implementa exatamente esta interface, sem mudar telas.
 */
export interface PortfolioRepository {
  readonly provider: "local" | "supabase";
  loadProjects(): Promise<Project[]>;
  saveProjects(projects: Project[]): Promise<void>;
  saveChangeLogs(logs: ChangeLogRecord[]): Promise<void>;
  savePlannerSnapshots(snapshots: PlannerSnapshot[]): Promise<void>;
  saveSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
}

/** Adaptador local (fonte atual). Mantém tudo isolado do Zustand. */
export class LocalPortfolioRepository implements PortfolioRepository {
  readonly provider = "local" as const;
  private projects: Project[] = [];
  private changeLogs: ChangeLogRecord[] = [];
  private plannerSnapshots: PlannerSnapshot[] = [];
  private snapshot: PortfolioSnapshot | null = null;

  /** Leitura usada por testes e pela futura hidratação da aplicação. */
  async loadSnapshot(): Promise<PortfolioSnapshot | null> {
    return this.snapshot;
  }

  async loadChangeLogs(): Promise<ChangeLogRecord[]> {
    return this.changeLogs.map((log) => ({ ...log }));
  }

  async loadPlannerSnapshots(): Promise<PlannerSnapshot[]> {
    return this.plannerSnapshots.map((snapshot) => ({ ...snapshot }));
  }

  async loadProjects(): Promise<Project[]> {
    return this.projects.map((project) => ({ ...project }));
  }

  async saveProjects(projects: Project[]): Promise<void> {
    this.projects = projects.map((project) => ({ ...project }));
  }

  async saveChangeLogs(logs: ChangeLogRecord[]): Promise<void> {
    this.changeLogs = logs.map((log) => ({ ...log }));
  }

  async savePlannerSnapshots(snapshots: PlannerSnapshot[]): Promise<void> {
    this.plannerSnapshots = snapshots.map((snapshot) => ({ ...snapshot }));
  }

  async saveSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }

  getSnapshot(): PortfolioSnapshot | null {
    return this.snapshot;
  }
}

/**
 * Esqueleto do adaptador Supabase. Não é instanciado até existirem as
 * variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e o cliente.
 *
 * Tabelas previstas:
 *   projects(id, ata, tipo, fase, fase_ordem, nome, sponsor, lider, pmo, ...)
 *   project_documents(id, project_id, doc_key, status, data_solicitacao, data_finalizacao)
 *   change_logs(id, project_id, source, changed_at, year, month, week, changes jsonb)
 *   planner_snapshots(id, project_id, created_at, bucket, horas_total, ...)
 */
export class SupabasePortfolioRepository implements PortfolioRepository {
  readonly provider = "supabase" as const;

  async loadProjects(): Promise<Project[]> {
    throw new Error("Supabase não configurado. Implemente o cliente nesta camada.");
  }

  async saveProjects(): Promise<void> {
    throw new Error("Supabase não configurado. Implemente o cliente nesta camada.");
  }

  async saveChangeLogs(): Promise<void> {
    throw new Error("Supabase não configurado. Implemente o cliente nesta camada.");
  }

  async savePlannerSnapshots(): Promise<void> {
    throw new Error("Supabase não configurado. Implemente o cliente nesta camada.");
  }

  async saveSnapshot(): Promise<void> {
    throw new Error("Supabase não configurado. Implemente o cliente nesta camada.");
  }
}

const localRepository = new LocalPortfolioRepository();

export function getPortfolioRepository(): PortfolioRepository {
  return localRepository;
}
