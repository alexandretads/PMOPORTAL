export type StatusKey =
  | "no_prazo"
  | "em_atencao"
  | "atrasado"
  | "sem_apuracao"
  | "parado"
  | "encerrado";

export type BinaryStatus = "SIM" | "NAO" | "NA" | "A_DEFINIR";

export interface ProjectDocument {
  status: BinaryStatus;
  dataSolicitacao: string | null;
  dataFinalizacao: string | null;
}

export interface Project {
  id: string;
  ata: string;
  tipo: string;
  fase: string;
  faseOrdem: number;
  nome: string;
  sponsor: string;
  lider: string;
  pmo: string;
  emailLider: string;
  avancoPrevisto: number | null;
  avancoReal: number | null;
  status: StatusKey;
  resumoExecutivo: string;
  impedimentos: string;
  tarefasPriorizadas: string[];
  previsaoGoLive: string | null;
  chamadoTopDesk: string;
  linkPlanner: string | null;
  ultimaAtualizacaoPlanner: string | null;
  /** Datas de reunião do acompanhamento (opcionais em planilhas antigas). */
  dataUltimaReuniao?: string | null;
  dataProximaReuniao?: string | null;
  documentos: Record<string, ProjectDocument>;
}

export type ChangeSource = "seed" | "prompt" | "planner";

export interface PendingPromptChange {
  projectId: string;
  changes: Partial<Project>;
  appliedAt: string;
  source: ChangeSource;
  sourceDetail: string | null;
}

export interface PlannerTask {
  numero: string;
  nivel: string;
  nome: string;
  atribuidoA: string;
  tempoNecessarioHoras: number;
  inicio: Date | null;
  concluir: Date | null;
  percentualConcluida: number;
  bucket: string;
}

export interface PlannerPlan {
  nomeProjeto: string;
  proprietario: string;
  percentualConcluida: number;
  exportadoEm: Date;
  tarefas: PlannerTask[];
  buckets: string[];
}

export interface PortfolioFilters {
  tipo: string | null;
  fase: string | null;
  pmo: string | null;
  status: StatusKey | null;
  busca: string;
}

export interface StatusUploadMeta {
  fileName: string;
  ciclo: string;
  uploadedAt: Date;
}

export type AvancoStatus = "sem_apuracao" | "no_prazo" | "em_atencao" | "atrasado";

export interface Avanco {
  horasTotal: number;
  horasReal: number;
  horasPrevistas: number;
  real: number | null;
  previsto: number | null;
  desvio: number | null;
  status: AvancoStatus;
}

export interface ParsedFase {
  ordem: number;
  nome: string;
}


/* =========================================================================
   Contratos de persistência — prontos para Supabase/API externa.
   ========================================================================= */

export interface HistoricalChangeRecord {
  field: string;
  oldValue: unknown;
  newValue?: unknown;
}

export interface ChangeLogRecord {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  source: ChangeSource;
  sourceDetail: string | null;
  changedAt: string;
  year: number;
  month: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  changes: HistoricalChangeRecord[];
}

export interface PlannerSnapshot {
  id: string;
  projectId: string;
  createdAt: string;
  bucket: string | null;
  horasTotal: number | null;
  horasReal: number | null;
  horasPrevistas: number | null;
  real: number | null;
  previsto: number | null;
  desvio: number | null;
  sourceFile: string | null;
}

export interface PortfolioSnapshot {
  schemaVersion: number;
  exportedAt: string;
  projects: Project[];
  changeLogs: ChangeLogRecord[];
  plannerSnapshots: PlannerSnapshot[];
}
