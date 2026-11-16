/**
 * Cabeçalhos oficiais dos documentos na planilha
 * "Status dos Projetos Detalhado" (aba NovS1).
 *
 * O parser e o exportador compartilham ESTA fonte para evitar divergência de
 * nomes — inclusive espaços duplos e preposições diferentes entre documentos.
 * A busca no parser usa `headerKey`, que remove espaços, acentos e pontuação,
 * portanto "Data Finalizado em  Canvas" e "Data Finalizado em Canvas" são
 * equivalentes. Os aliases cobrem versões antigas da planilha.
 */
export interface DocumentColumnSpec {
  key: string;
  label: string;
  status: readonly string[];
  dataSolicitacao: readonly string[];
  dataFinalizacao: readonly string[];
}

export const DOCUMENT_COLUMNS: readonly DocumentColumnSpec[] = [
  {
    key: "canvas",
    label: "Canvas",
    status: ["Canvas"],
    dataSolicitacao: ["Data do solicitação Canvas", "Data solicitação Canvas", "Data de solicitação Canvas"],
    dataFinalizacao: [
      "Data Finalizado em Canvas",
      "Data Finalizado Canvas",
      "Data de Finalização Canvas",
    ],
  },
  {
    key: "eap",
    label: "EAP",
    status: ["EAP"],
    dataSolicitacao: ["Data da solicitação EAP", "Data solicitação EAP", "Data de solicitação EAP"],
    dataFinalizacao: ["Data Finalizado em EAP", "Data Finalizado EAP", "Data de Finalização EAP"],
  },
  {
    key: "esg",
    label: "ESG",
    status: ["ESG"],
    dataSolicitacao: ["Data da solicitação ESG", "Data solicitação ESG", "Data de solicitação ESG"],
    dataFinalizacao: ["Data Finalizado em ESG", "Data Finalizado ESG", "Data de Finalização ESG"],
  },
  {
    key: "rip",
    label: "RIP",
    status: ["RIP"],
    dataSolicitacao: ["Data da solicitação RIP", "Data solicitação RIP", "Data de solicitação RIP"],
    dataFinalizacao: ["Data Finalizado em RIP", "Data Finalizado RIP", "Data de Finalização RIP"],
  },
  {
    key: "compliance",
    label: "Parecer Compliance",
    status: ["Parecer Compliance", "Compliance"],
    dataSolicitacao: [
      "Data da solicitação Compliance",
      "Data solicitação Compl.",
      "Data solicitação Compliance",
      "Data do solicitação Parecer Compliance",
    ],
    dataFinalizacao: [
      "Data Finalizado em Compliance",
      "Data Finalizado Compl.",
      "Data Finalizado Compliance",
      "Data Finalizado em Parecer Compliance",
    ],
  },
  {
    key: "pessoas",
    label: "Viabilidade de Pessoas e Cultura",
    status: ["Viabilidade de Pessoas e Cultura", "Viabilidade Pessoas", "Pessoas"],
    dataSolicitacao: [
      "Data da solicitação Pessoas e Cultura",
      "Data solic. Pessoas",
      "Data solicitação Pessoas",
      "Data do solicitação Viabilidade de Pessoas e Cultura",
    ],
    dataFinalizacao: [
      "Data Finalizado em Pessoas e Cultura",
      "Data Final. Pessoas",
      "Data Finalizado Pessoas",
      "Data Finalizado em Viabilidade de Pessoas e Cultura",
    ],
  },
  {
    key: "ti",
    label: "Viabilidade de TI",
    status: ["Viabilidade de TI", "Viabilidade TI", "TI"],
    dataSolicitacao: [
      "Data da solicitação TI",
      "Data solic. TI",
      "Data solicitação TI",
      "Data do solicitação Viabilidade de TI",
    ],
    dataFinalizacao: [
      "Data Finalizado em TI",
      "Data Final. TI",
      "Data Finalizado TI",
      "Data Finalizado em Viabilidade de TI",
    ],
  },
  {
    key: "engenharia",
    label: "Viabilidade da Engenharia",
    status: ["Viabilidade da Engenharia", "Viabilidade Engenharia", "Engenharia"],
    dataSolicitacao: [
      "Data da solicitação Engenharia",
      "Data solic. Eng.",
      "Data solicitação Engenharia",
      "Data do solicitação Viabilidade da Engenharia",
    ],
    dataFinalizacao: [
      "Data Finalizado em Engenharia",
      "Data Final. Eng.",
      "Data Finalizado Engenharia",
      "Data Finalizado em Viabilidade da Engenharia",
    ],
  },
  {
    key: "financeira",
    label: "Viabilidade Financeira",
    status: ["Viabilidade Financeira", "Financeiro", "Financeira"],
    dataSolicitacao: [
      "Data da solicitação Financeiro",
      "Data solic. Financ.",
      "Data solicitação Financeira",
      "Data do solicitação Viabilidade Financeira",
    ],
    dataFinalizacao: [
      "Data Finalizado em Financeiro",
      "Data Final. Financ.",
      "Data Finalizado Financeira",
      "Data Finalizado em Viabilidade Financeira",
    ],
  },
  {
    key: "parecerConsolidado",
    label: "Parecer Consolidado",
    status: ["Parecer Consolidado", "Parecer"],
    dataSolicitacao: [
      "Data da solicitação Parecer Consolidado",
      "Data solicitação Parecer Consolidado",
    ],
    dataFinalizacao: [
      "Data Finalizado em Parecer Consolidado",
      "Data Finalizado Parecer Consolidado",
    ],
  },
  {
    key: "tap",
    label: "TAP",
    status: ["TAP"],
    dataSolicitacao: [
      "Data da confecção TAP",
      "Data confecção TAP",
      "Data solicitação TAP",
    ],
    dataFinalizacao: [
      "Data da assinatura TAP",
      "Data assinatura TAP",
      "Data Finalizado em TAP",
    ],
  },
  {
    key: "tep",
    label: "TEP",
    status: ["TEP"],
    dataSolicitacao: [
      "Data da confecção TEP",
      "Data confecção TEP",
      "Data solicitação TEP",
    ],
    dataFinalizacao: [
      "Data da assinatura TEP",
      "Data assinatura TEP",
      "Data Finalizado em TEP",
    ],
  },
  {
    key: "kickoff",
    label: "Kick-off",
    status: ["Kick-off", "Kickoff"],
    dataSolicitacao: [
      "Data prevista do Kick-off",
      "Data prevista Kick-off",
      "Data prevista Kickoff",
    ],
    dataFinalizacao: [
      "Data realizada do Kick-off",
      "Data realizada Kick-off",
      "Data realizada Kickoff",
    ],
  },
  {
    key: "planner",
    label: "Planner",
    status: ["Planner"],
    dataSolicitacao: [
      "Data da solicitação/criação do Planner",
      "Data solic./criação Planner",
      "Data solicitação Planner",
    ],
    dataFinalizacao: [
      "Data de disponibilização do Planner",
      "Data disponibilização Planner",
    ],
  },
] as const;
