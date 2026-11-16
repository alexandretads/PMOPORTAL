import { parseISO } from "date-fns";
import type { Project, ProjectDocument } from "@/types";
import { getWeekForDate, type ChangeLogEntry } from "@/lib/calc/weekCalendar";
import type { HistoricalFieldChange } from "@/lib/calc/timeMachine";

type DemoHistoryEntry = ChangeLogEntry & {
  changedAt: string;
  changes: HistoricalFieldChange[];
};

type DemoProject = Project & { historico?: DemoHistoryEntry[] };

const DOCUMENT_KEYS = [
  "canvas",
  "eap",
  "esg",
  "rip",
  "compliance",
  "pessoas",
  "ti",
  "engenharia",
  "financeira",
  "tap",
  "tep",
  "kickoff",
  "planner",
] as const;

function emptyDocument(): ProjectDocument {
  return {
    status: "A_DEFINIR",
    dataSolicitacao: null,
    dataFinalizacao: null,
  };
}

function buildDocuments(
  overrides: Partial<Record<(typeof DOCUMENT_KEYS)[number], Partial<ProjectDocument>>> = {}
): Record<string, ProjectDocument> {
  return DOCUMENT_KEYS.reduce<Record<string, ProjectDocument>>((documents, key) => {
    documents[key] = { ...emptyDocument(), ...overrides[key] };
    return documents;
  }, {});
}

function createSeedId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `seed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Os campos year/month/week/weekStart/weekEnd são calculados uma única vez
 * no seed e permanecem gravados no registro de histórico.
 */
function seedEntry(input: {
  data: string;
  descricao: string;
  origem: string;
  changes: HistoricalFieldChange[];
  changedAt?: string;
}): DemoHistoryEntry {
  const week = getWeekForDate(parseISO(input.data));
  return {
    id: createSeedId(),
    data: input.data,
    descricao: input.descricao,
    source: "seed",
    origem: input.origem,
    changedAt: input.changedAt ?? `${input.data}T17:30:00-04:00`,
    changes: input.changes,
    ...week,
  };
}

/**
 * Amostra local — nenhum dado real de portfólio.
 * Os quatro projetos abaixo são explicitamente DEMO até o upload da planilha.
 *
 * Calendário de histórico: semanas de segunda a sexta, pertencentes ao mês da
 * quarta-feira. Seeds em out–nov/2026:
 *   24 → Nov S1 (05/11), Nov S2 (11/11), Nov S2 (12/11)
 *   4  → Nov S1 (03/11)
 *   10 → Out S4 (28/10)
 *   1  → sem histórico (estado vazio)
 */
export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "1",
    ata: "DEMO-01",
    tipo: "Estratégico",
    fase: "Ideia",
    faseOrdem: 1,
    nome: "Novo modelo de Atenção Primária",
    sponsor: "Iara Freitas",
    lider: "Paulo Ricardo Queiroz da Rocha",
    pmo: "Alexandre",
    emailLider: "",
    avancoPrevisto: null,
    avancoReal: 0,
    status: "sem_apuracao",
    resumoExecutivo:
      "Projeto temporariamente pausado. Continuidade condicionada à implantação dos novos softwares da APS.",
    impedimentos: "",
    tarefasPriorizadas: [],
    previsaoGoLive: null,
    chamadoTopDesk: "",
    linkPlanner: null,
    ultimaAtualizacaoPlanner: null,
    documentos: buildDocuments(),
  },
  {
    id: "4",
    ata: "DEMO-04",
    tipo: "Estratégico",
    fase: "Execução",
    faseOrdem: 5,
    nome: "Revitalização da Sede",
    sponsor: "Filipe Vieira",
    lider: "Willian Maciel Martinez",
    pmo: "Fernando",
    emailLider: "",
    avancoPrevisto: null,
    avancoReal: 0.39,
    status: "em_atencao",
    resumoExecutivo:
      "Revitalização suspensa para revisão de viabilidade. Proposta de R$ 328 mil supera orçamento inicial de R$ 318 mil.",
    impedimentos: "",
    tarefasPriorizadas: [],
    previsaoGoLive: null,
    chamadoTopDesk: "",
    linkPlanner:
      "https://planner.cloud.microsoft/webui/plan/DEMO-REVITALIZACAO-SEDE/view/board",
    ultimaAtualizacaoPlanner: null,
    documentos: buildDocuments(),
    historico: [
      seedEntry({
        data: "2026-11-03",
        descricao:
          "Revitalização suspensa para revisão de viabilidade orçamentária.",
        origem: "Prompt Atualizador",
        changedAt: "2026-11-03T16:40:00-04:00",
        changes: [
          { field: "avancoReal", oldValue: 0.22, newValue: 0.39 },
          {
            field: "resumoExecutivo",
            oldValue:
              "Revitalização em análise inicial de escopo e orçamento.",
            newValue:
              "Revitalização suspensa para revisão de viabilidade. Proposta de R$ 328 mil supera orçamento inicial de R$ 318 mil.",
          },
          { field: "status", oldValue: "sem_apuracao", newValue: "em_atencao" },
        ],
      }),
    ],
  },
  {
    id: "24",
    ata: "DEMO-24",
    tipo: "Tático",
    fase: "Execução",
    faseOrdem: 5,
    nome: "Cadeia de Suprimentos",
    sponsor: "Filipe Vieira",
    lider: "Willian Maciel Martinez",
    pmo: "Alexandre",
    emailLider: "",
    avancoPrevisto: 0.767,
    avancoReal: 0.738,
    status: "em_atencao",
    resumoExecutivo:
      "Avanço real de 73,8%, frente a 76,7% previsto, desvio de -2,9 p.p. Pendências em rastreabilidade, Multiempresa, Data Matrix.",
    impedimentos: "",
    tarefasPriorizadas: ["Rastreabilidade", "Multiempresa", "Data Matrix"],
    previsaoGoLive: null,
    chamadoTopDesk: "",
    linkPlanner:
      "https://planner.cloud.microsoft/webui/plan/DEMO-CADEIA-SUPRIMENTOS/view/board",
    ultimaAtualizacaoPlanner: null,
    documentos: buildDocuments({
      eap: {
        status: "SIM",
        dataSolicitacao: "2026-11-02",
        dataFinalizacao: "2026-11-10",
      },
    }),
    historico: [
      seedEntry({
        data: "2026-11-12",
        descricao:
          "Resumo executivo atualizado com as pendências de rastreabilidade, Multiempresa e Data Matrix.",
        origem: "Prompt Atualizador",
        changedAt: "2026-11-12T17:20:00-04:00",
        changes: [
          {
            field: "resumoExecutivo",
            oldValue:
              "Avanço real de 68,0%, frente a 76,7% previsto. Projeto em acompanhamento inicial.",
            newValue:
              "Avanço real de 73,8%, frente a 76,7% previsto, desvio de -2,9 p.p. Pendências em rastreabilidade, Multiempresa, Data Matrix.",
          },
          {
            field: "impedimentos",
            oldValue: "Pendências em rastreabilidade e Multiempresa.",
            newValue: "",
          },
        ],
      }),
      seedEntry({
        data: "2026-11-11",
        descricao:
          "Avanço real revisado para 73,8% no acompanhamento semanal do bucket Cadeia de Suprimentos.",
        origem: "Planner",
        changedAt: "2026-11-11T09:15:00-04:00",
        changes: [
          { field: "avancoReal", oldValue: 0.68, newValue: 0.738 },
          {
            field: "documentos.eap",
            oldValue: {
              status: "NAO",
              dataSolicitacao: null,
              dataFinalizacao: null,
            },
            newValue: {
              status: "SIM",
              dataSolicitacao: "2026-11-02",
              dataFinalizacao: "2026-11-10",
            },
          },
        ],
      }),
      seedEntry({
        data: "2026-11-05",
        descricao:
          "Avanço previsto ajustado para 76,7% após revisão do cronograma.",
        origem: "Planner",
        changedAt: "2026-11-05T14:30:00-04:00",
        changes: [
          { field: "avancoPrevisto", oldValue: 0.72, newValue: 0.767 },
          {
            field: "tarefasPriorizadas",
            oldValue: ["Rastreabilidade", "Multiempresa"],
            newValue: ["Rastreabilidade", "Multiempresa", "Data Matrix"],
          },
        ],
      }),
    ],
  },
  {
    id: "10",
    ata: "DEMO-10",
    tipo: "Estratégico",
    fase: "Encerramento",
    faseOrdem: 6,
    nome: "Projeto Cirurgia Robótica",
    sponsor: "Filipe Vieira",
    lider: "Raiara Goncalves Cordeiro",
    pmo: "Fernando",
    emailLider: "",
    avancoPrevisto: null,
    avancoReal: 0.99,
    status: "encerrado",
    resumoExecutivo: "TEP estruturado, previsão de assinatura em 30/10/2026.",
    impedimentos: "",
    tarefasPriorizadas: [],
    previsaoGoLive: "2026-10-30",
    chamadoTopDesk: "",
    linkPlanner:
      "https://planner.cloud.microsoft/webui/plan/DEMO-CIRURGIA-ROBOTICA/view/board",
    ultimaAtualizacaoPlanner: null,
    documentos: buildDocuments(),
    historico: [
      seedEntry({
        data: "2026-10-28",
        descricao: "TEP estruturado; previsão de assinatura em 30/10/2026.",
        origem: "Planner",
        changedAt: "2026-10-28T15:10:00-04:00",
        changes: [
          { field: "avancoReal", oldValue: 0.95, newValue: 0.99 },
          { field: "status", oldValue: "em_atencao", newValue: "encerrado" },
          {
            field: "previsaoGoLive",
            oldValue: null,
            newValue: "2026-10-30",
          },
        ],
      }),
    ],
  },
];

export const DEMO_CYCLE = "Demonstração";

export function cloneDemoProjects(): Project[] {
  return DEMO_PROJECTS.map((project): DemoProject => ({
    ...project,
    tarefasPriorizadas: [...project.tarefasPriorizadas],
    documentos: Object.fromEntries(
      Object.entries(project.documentos).map(([key, document]) => [key, { ...document }])
    ),
    ...(project.historico
      ? { historico: project.historico.map((entry) => ({ ...entry })) }
      : {}),
  }));
}
