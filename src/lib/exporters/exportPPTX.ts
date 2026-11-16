import PptxGenJS from "pptxgenjs";
import type { BinaryStatus, Project, StatusKey } from "@/types";
import { formatDateBR, formatPercent } from "@/lib/format";
import { normalizeKey } from "@/lib/normalize";

/**
 * Exportação PPTX — padrão visual oficial do PMO Unimed Campo Grande.
 *
 * Seção 1 (slides 1–5): capa e visão geral por fase.
 * Seção 2 (slides 6+): acompanhamento semanal por PMO.
 * Seção 3 (slides seguintes): lâmina completa de cada projeto.
 *
 * Todos os números são derivados de `projects`; os exemplos da especificação
 * são apenas referências visuais. O arquivo é montado 100% no navegador.
 */

const C = {
  dark: "003D2E",
  primary: "006B4F",
  primaryDeep: "00523C",
  accent: "00A67A",
  accentSoft: "D6F0E6",
  accentTint: "EDF8F3",
  amber: "D97706",
  amberTint: "FEF3C7",
  red: "DC2626",
  redTint: "FEE2E2",
  violet: "7C3AED",
  cyan: "0891B2",
  slate: "0F172A",
  muted: "64748B",
  grey: "94A3B8",
  border: "E5E7EB",
  headerBg: "F8FAF9",
  surface: "FFFFFF",
  softText: "A3AEBE",
} as const;

const FONT = "Arial";
const PAGE_W = 10;
const PAGE_H = 5.625;
const MARGIN = 0.42;
const CONTENT_W = PAGE_W - MARGIN * 2;

const TOTAL_PHASES = [
  "Ideia",
  "Análise",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
  "Parado",
  "Cancelado",
] as const;

const CATEGORY_PHASES = [
  "Ideia",
  "Análise",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
  "Prioridade",
  "A definir",
] as const;

const ACTION_PHASES = ["Execução", "Parado", "Cancelado"] as const;

type TotalPhase = (typeof TOTAL_PHASES)[number];
type CategoryPhase = (typeof CATEGORY_PHASES)[number];
type ActionPhase = (typeof ACTION_PHASES)[number];
type TipoCategory = "Estratégico" | "Tático" | "Plano de Ação";

const STATUS_LABEL: Record<StatusKey, string> = {
  no_prazo: "NO PRAZO",
  em_atencao: "EM ATENÇÃO",
  atrasado: "ATRASADO",
  sem_apuracao: "SEM APURAÇÃO",
  parado: "PARADO",
  encerrado: "ENCERRADO",
};

const STATUS_COLOR: Record<StatusKey, string> = {
  no_prazo: C.accent,
  em_atencao: C.amber,
  atrasado: C.red,
  sem_apuracao: C.grey,
  parado: C.violet,
  encerrado: C.cyan,
};

const STATUS_TINT: Record<StatusKey, string> = {
  no_prazo: C.accentTint,
  em_atencao: C.amberTint,
  atrasado: C.redTint,
  sem_apuracao: "F1F5F9",
  parado: "F5F3FF",
  encerrado: "ECFEFF",
};

const DOCUMENTS: Array<{ label: string; aliases: string[] }> = [
  { label: "Canvas", aliases: ["canvas"] },
  { label: "EAP", aliases: ["eap"] },
  { label: "ESG", aliases: ["esg"] },
  { label: "RIP", aliases: ["rip"] },
  { label: "Compliance", aliases: ["compliance", "parecerCompliance"] },
  { label: "Pessoas", aliases: ["pessoas", "viabilidadePessoas"] },
  { label: "TI", aliases: ["ti", "viabilidadeTi"] },
  { label: "Engenharia", aliases: ["engenharia", "viabilidadeEngenharia"] },
  { label: "Financeiro", aliases: ["financeira", "viabilidadeFinanceira"] },
  { label: "Parecer", aliases: ["parecerConsolidado", "consolidado"] },
  { label: "TAP", aliases: ["tap"] },
  { label: "TEP", aliases: ["tep"] },
  { label: "Kick-off", aliases: ["kickoff", "kickOff"] },
  { label: "Planner", aliases: ["planner"] },
];

const PMO_ORDER = ["Alexandre", "Bruno", "Fernando"] as const;
const MAX_TABLE_ROWS = 8;

/* --------------------------------- helpers -------------------------------- */

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function reportDate(): string {
  return formatDateBR(todayIso());
}

function projectUrl(project: Project): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://portal-pmo.unimedcampogrande.local";
  return `${origin.replace(/\/+$/, "")}/projetos/${encodeURIComponent(project.id)}`;
}

function tipoCategory(project: Project): TipoCategory {
  const key = normalizeKey(project.tipo);
  if (key.includes("tatic") || key.includes("tático")) return "Tático";
  if (key.includes("plano") || key.includes("acao") || key.includes("ação")) {
    return "Plano de Ação";
  }
  return "Estratégico";
}

function normalizedPhase(project: Project): string {
  return normalizeKey(project.fase);
}

function totalPhase(project: Project): TotalPhase {
  const key = normalizedPhase(project);
  if (key.includes("ideia")) return "Ideia";
  if (key.includes("analise") || key.includes("viabilidade")) return "Análise";
  if (key.includes("aprovacao")) return "Aprovação";
  if (key.includes("planejamento")) return "Planejamento";
  if (key.includes("execucao")) return "Execução";
  if (key.includes("encerramento") || key.includes("conclu")) return "Encerramento";
  if (key.includes("parad") || key.includes("pausad") || key.includes("suspens")) {
    return "Parado";
  }
  if (key.includes("cancel")) return "Cancelado";
  return "Parado";
}

function categoryPhase(project: Project): CategoryPhase {
  const key = normalizedPhase(project);
  if (key.includes("ideia")) return "Ideia";
  if (key.includes("analise") || key.includes("viabilidade")) return "Análise";
  if (key.includes("aprovacao")) return "Aprovação";
  if (key.includes("planejamento")) return "Planejamento";
  if (key.includes("execucao")) return "Execução";
  if (key.includes("encerramento") || key.includes("conclu")) return "Encerramento";
  if (key.includes("prioridade")) return "Prioridade";
  return "A definir";
}

function actionPhase(project: Project): ActionPhase {
  const key = normalizedPhase(project);
  if (key.includes("execucao")) return "Execução";
  if (key.includes("parad") || key.includes("pausad") || key.includes("suspens")) {
    return "Parado";
  }
  if (key.includes("cancel")) return "Cancelado";
  return "Execução";
}

function countBy<T extends string>(
  projects: Project[],
  phases: readonly T[],
  resolver: (project: Project) => T
): Array<{ label: T; count: number }> {
  return phases.map((label) => ({
    label,
    count: projects.filter((project) => resolver(project) === label).length,
  }));
}

function pmoName(project: Project): string {
  return clean(project.pmo);
}

function getAllPmos(projects: Project[]): string[] {
  const names = new Set<string>(PMO_ORDER);
  for (const project of projects) {
    const name = pmoName(project);
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => {
    const aIndex = PMO_ORDER.indexOf(a as (typeof PMO_ORDER)[number]);
    const bIndex = PMO_ORDER.indexOf(b as (typeof PMO_ORDER)[number]);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.localeCompare(b, "pt-BR");
  });
}

function addText(
  slide: PptxGenJS.Slide,
  text: string,
  options: PptxGenJS.TextPropsOptions
): void {
  slide.addText(text, {
    fontFace: FONT,
    fit: "shrink",
    margin: 0,
    ...options,
  });
}

function addFooterBrand(slide: PptxGenJS.Slide, withDate = true): void {
  addText(slide, "Portal PMO · Unimed Campo Grande", {
    x: MARGIN,
    y: PAGE_H - 0.27,
    w: 4.6,
    h: 0.16,
    fontSize: 6.5,
    color: C.grey,
  });
  addText(slide, withDate ? `Acompanhamento Semanal · ${reportDate()}` : "", {
    x: PAGE_W - MARGIN - 3.2,
    y: PAGE_H - 0.27,
    w: 3.2,
    h: 0.16,
    fontSize: 6.5,
    color: C.grey,
    align: "right",
  });
}

function addContentBase(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  title: string,
  subtitle?: string,
  showFooter = true
): void {
  slide.background = { color: C.surface };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: PAGE_W,
    h: 0.075,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
  addText(slide, title, {
    x: MARGIN,
    y: 0.2,
    w: CONTENT_W,
    h: 0.32,
    fontFace: FONT,
    fontSize: 17,
    bold: true,
    color: C.slate,
  });
  if (subtitle) {
    addText(slide, subtitle, {
      x: MARGIN,
      y: 0.52,
      w: CONTENT_W,
      h: 0.18,
      fontSize: 8,
      color: C.muted,
    });
  }
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN,
    y: 0.74,
    w: CONTENT_W,
    h: 0.012,
    fill: { color: C.border },
    line: { color: C.border, width: 0 },
  });
  if (showFooter) addFooterBrand(slide);
}

/* ----------------------------- Seção 1 — capa ----------------------------- */

function buildCover(pptx: PptxGenJS, projects: Project[]): void {
  const slide = pptx.addSlide();
  slide.background = { color: C.dark };

  // Marcas decorativas dentro dos limites do slide.
  slide.addShape(pptx.ShapeType.ellipse, {
    x: PAGE_W - 2.45,
    y: 0.35,
    w: 2.05,
    h: 2.05,
    fill: { color: C.primary, transparency: 52 },
    line: { color: C.primary, width: 0 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: PAGE_W - 1.35,
    y: 3.55,
    w: 1.05,
    h: 1.05,
    fill: { color: C.accent, transparency: 80 },
    line: { color: C.accent, width: 0 },
  });

  // Marca do portal.
  slide.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN,
    y: 0.42,
    w: 0.36,
    h: 0.36,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
    rectRadius: 0.06,
  });
  addText(slide, "PMO", {
    x: MARGIN,
    y: 0.42,
    w: 0.36,
    h: 0.36,
    fontFace: FONT,
    fontSize: 7,
    bold: true,
    color: C.surface,
    align: "center",
    valign: "middle",
  });
  addText(slide, "Portal PMO", {
    x: MARGIN + 0.46,
    y: 0.4,
    w: 3.4,
    h: 0.21,
    fontSize: 12,
    bold: true,
    color: C.surface,
  });
  addText(slide, "UNIMED CAMPO GRANDE", {
    x: MARGIN + 0.46,
    y: 0.6,
    w: 3.4,
    h: 0.16,
    fontSize: 6.5,
    bold: true,
    color: C.accentSoft,
    charSpacing: 1.3,
  });

  addText(slide, "ACOMPANHAMENTO SEMANAL DO PORTFÓLIO", {
    x: MARGIN,
    y: 1.28,
    w: 7,
    h: 0.18,
    fontSize: 6.5,
    bold: true,
    color: C.accent,
    charSpacing: 1.5,
  });
  addText(slide, "Acompanhamento Semanal de Projetos", {
    x: MARGIN,
    y: 1.48,
    w: 8.6,
    h: 0.76,
    fontSize: 29,
    bold: true,
    color: C.surface,
  });
  addText(slide, "PMO Unimed Campo Grande", {
    x: MARGIN,
    y: 2.26,
    w: 6.8,
    h: 0.24,
    fontSize: 11,
    color: "D7EFE6",
  });
  addText(slide, `Report de ${reportDate()}`, {
    x: MARGIN,
    y: 2.51,
    w: 5,
    h: 0.2,
    fontSize: 8,
    color: "A9CEC1",
  });

  const inExecution = projects.filter((project) => totalPhase(project) === "Execução").length;
  const strategy = projects.filter((project) => tipoCategory(project) === "Estratégico").length;
  const stopped = projects.filter((project) => totalPhase(project) === "Parado").length;

  const cards: Array<{ value: number; label: string }> = [
    { value: projects.length, label: "Total de Projetos" },
    { value: inExecution, label: "Execução" },
    { value: strategy, label: "Estratégicos" },
    { value: stopped, label: "Parados" },
  ];

  const gap = 0.14;
  const cardWidth = (CONTENT_W - gap * 3) / 4;
  const cardY = 3.32;
  const cardH = 1.28;

  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: cardY,
      w: cardWidth,
      h: cardH,
      fill: { color: C.surface },
      line: { color: C.surface, width: 0 },
      rectRadius: 0.07,
      shadow: { type: "outer", color: "000000", opacity: 0.18, blur: 4, angle: 45, offset: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.18,
      y: cardY + 0.2,
      w: 0.36,
      h: 0.035,
      fill: { color: index === 0 ? C.primary : C.accent },
      line: { color: index === 0 ? C.primary : C.accent, width: 0 },
    });
    addText(slide, String(card.value), {
      x: x + 0.18,
      y: cardY + 0.34,
      w: cardWidth - 0.36,
      h: 0.5,
      fontSize: 27,
      bold: true,
      color: index === 0 ? C.primary : C.dark,
    });
    addText(slide, card.label, {
      x: x + 0.18,
      y: cardY + 0.9,
      w: cardWidth - 0.36,
      h: 0.22,
      fontSize: 7.5,
      bold: true,
      color: C.muted,
      charSpacing: 0.4,
    });
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN,
    y: PAGE_H - 0.32,
    w: CONTENT_W,
    h: 0.008,
    fill: { color: "1B5E4B" },
    line: { color: "1B5E4B", width: 0 },
  });
  addText(slide, `Gerado em ${reportDate()}`, {
    x: MARGIN,
    y: PAGE_H - 0.24,
    w: 4,
    h: 0.14,
    fontSize: 6.5,
    color: "8FB9AB",
  });
  addText(slide, "Portal PMO · Unimed Campo Grande", {
    x: PAGE_W - MARGIN - 3.4,
    y: PAGE_H - 0.24,
    w: 3.4,
    h: 0.14,
    fontSize: 6.5,
    color: "8FB9AB",
    align: "right",
  });
}

/* --------------------- Seção 1 — projetos por fase ------------------------ */

function buildPhaseSlide(
  pptx: PptxGenJS,
  projects: Project[],
  options: {
    title: string;
    category?: TipoCategory;
    phases: readonly string[];
    resolver: (project: Project) => string;
    leftValue: number;
    leftCaption: string;
    leftEyebrow: string;
  }
): void {
  const slide = pptx.addSlide();
  const subtitle =
    options.category === undefined
      ? "Distribuição consolidada do portfólio · todas as fases"
      : `${options.category} · ${options.leftValue} ${
          options.leftValue === 1 ? "projeto" : "projetos"
        }`;
  addContentBase(pptx, slide, options.title, subtitle);

  const countMap = new Map<string, number>();
  for (const phase of options.phases) countMap.set(phase, 0);
  for (const project of projects) {
    const phase = options.resolver(project);
    if (countMap.has(phase)) countMap.set(phase, (countMap.get(phase) ?? 0) + 1);
  }

  // Box verde vertical à esquerda.
  const boxX = MARGIN;
  const boxY = 1.02;
  const boxW = 1.58;
  const boxH = 3.2;
  slide.addShape(pptx.ShapeType.rect, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
    shadow: { type: "outer", color: "003D2E", opacity: 0.22, blur: 5, angle: 45, offset: 1 },
  });
  addText(slide, options.leftEyebrow, {
    x: boxX + 0.16,
    y: boxY + 0.22,
    w: boxW - 0.32,
    h: 0.2,
    fontSize: 6.5,
    bold: true,
    color: C.accentSoft,
    charSpacing: 0.9,
  });
  addText(slide, String(options.leftValue), {
    x: boxX + 0.16,
    y: boxY + 0.55,
    w: boxW - 0.32,
    h: 1.1,
    fontSize: 50,
    bold: true,
    color: C.surface,
  });
  addText(slide, options.leftCaption, {
    x: boxX + 0.16,
    y: boxY + 1.68,
    w: boxW - 0.32,
    h: 0.36,
    fontSize: 8.5,
    bold: true,
    color: C.accentSoft,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: boxX + 0.16,
    y: boxY + 2.2,
    w: 0.45,
    h: 0.035,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  });
  addText(
    slide,
    options.category === "Plano de Ação"
      ? "Ações corretivas e projetos em tratamento especial."
      : "Leitura de maturidade do portfólio no ciclo.",
    {
      x: boxX + 0.16,
      y: boxY + 2.28,
      w: boxW - 0.32,
      h: 0.6,
      fontSize: 7,
      color: "D7EFE6",
      lineSpacingMultiple: 1.12,
    }
  );

  // Cards brancos de fases à direita.
  const gridX = boxX + boxW + 0.22;
  const gridW = PAGE_W - MARGIN - gridX;
  const count = options.phases.length;
  const gap = 0.09;
  const cardW = (gridW - gap * (count - 1)) / count;
  const cardY = 1.02;
  const cardH = 3.2;

  options.phases.forEach((phase, index) => {
    const x = gridX + index * (cardW + gap);
    const value = countMap.get(phase) ?? 0;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: C.surface },
      line: { color: C.border, width: 0.75 },
      shadow: { type: "outer", color: "0F172A", opacity: 0.08, blur: 3, angle: 45, offset: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: cardY,
      w: cardW,
      h: 0.05,
      fill: { color: value > 0 ? C.accent : C.border },
      line: { color: value > 0 ? C.accent : C.border, width: 0 },
    });
    addText(slide, String(value), {
      x: x + 0.05,
      y: cardY + 0.32,
      w: cardW - 0.1,
      h: 0.62,
      fontSize: count <= 4 ? 36 : 28,
      bold: true,
      color: value > 0 ? C.primary : C.softText,
      align: "center",
    });
    addText(slide, phase, {
      x: x + 0.04,
      y: cardY + 1.02,
      w: cardW - 0.08,
      h: 0.54,
      fontSize: count <= 4 ? 8 : 7,
      bold: true,
      color: C.muted,
      align: "center",
      valign: "top",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + cardW / 2 - 0.16,
      y: cardY + 1.72,
      w: 0.32,
      h: 0.025,
      fill: { color: value > 0 ? C.accent : C.border },
      line: { color: value > 0 ? C.accent : C.border, width: 0 },
    });
  });
}

/* ----------------------- Seção 2 — por PMO -------------------------------- */

interface PmoSlidePlan {
  pmo: string;
  projects: Project[];
  firstSlideNumber: number;
  chunks: Project[][];
}

function drawStatusCell(project: Project): PptxGenJS.TableCell {
  return {
    text: STATUS_LABEL[project.status],
    options: {
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: STATUS_COLOR[project.status],
      fill: { color: STATUS_TINT[project.status] },
      valign: "middle",
      margin: 0.05,
    },
  };
}

function buildPmoSlide(
  pptx: PptxGenJS,
  plan: PmoSlidePlan,
  chunkIndex: number
): void {
  const slide = pptx.addSlide();
  const chunk = plan.chunks[chunkIndex];
  const isFirst = chunkIndex === 0;
  const isLast = chunkIndex === plan.chunks.length - 1;
  const title = `Acompanhamento Semanal de Projetos | PMO ${plan.pmo}`;

  addContentBase(
    pptx,
    slide,
    title,
    isFirst
      ? `${plan.projects.length} ${plan.projects.length === 1 ? "projeto" : "projetos"} do PMO`
      : `Continuação · parte ${chunkIndex + 1} de ${plan.chunks.length}`
  );

  if (isFirst) {
    const phaseCounts = countBy(plan.projects, CATEGORY_PHASES, categoryPhase).filter(
      (entry) => entry.count > 0
    );
    const summary = [
      `${plan.projects.length} ${plan.projects.length === 1 ? "Projeto" : "Projetos"} do PMO`,
      ...phaseCounts.map((entry) => `${entry.count} ${entry.label}`),
    ].join("  |  ");

    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN,
      y: 0.86,
      w: CONTENT_W,
      h: 0.42,
      fill: { color: C.accentTint },
      line: { color: C.accentSoft, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN,
      y: 0.86,
      w: 0.06,
      h: 0.42,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
    });
    addText(slide, summary, {
      x: MARGIN + 0.18,
      y: 0.93,
      w: CONTENT_W - 0.3,
      h: 0.26,
      fontSize: 8.5,
      bold: true,
      color: C.dark,
    });
  }

  if (plan.projects.length === 0) {
    const emptyHeader: PptxGenJS.TableRow = [
      { text: "CHAMADO", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "TIPO", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "PROJETO", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "FASE", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "% PREV.", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "% REAL", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
      { text: "STATUS", options: { bold: true, fontSize: 9, color: C.slate, fill: { color: C.headerBg } } },
    ];
    slide.addTable(
      [
        emptyHeader,
        [
          {
            text: "Nenhum projeto vinculado a este PMO no ciclo.",
            options: {
              colspan: 7,
              align: "center",
              fontSize: 9,
              color: C.muted,
              fill: { color: C.surface },
            },
          },
        ],
      ],
      {
        x: MARGIN,
        y: 1.42,
        w: CONTENT_W,
        colW: [0.82, 1.0, 3.46, 1.35, 0.72, 0.72, 1.13],
        rowH: 0.34,
        border: { type: "solid", pt: 0.75, color: C.border },
        fontFace: FONT,
      }
    );
    return;
  }

  const headerOptions = (align?: "left" | "center" | "right"): PptxGenJS.TableCellProps => ({
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: C.slate,
    fill: { color: C.headerBg },
    align,
    valign: "middle",
    margin: 0.06,
  });

  const headerRow: PptxGenJS.TableRow = [
    { text: "CHAMADO", options: headerOptions() },
    { text: "TIPO", options: headerOptions() },
    { text: "PROJETO", options: headerOptions() },
    { text: "FASE", options: headerOptions() },
    { text: "% PREV.", options: headerOptions("center") },
    { text: "% REAL", options: headerOptions("center") },
    { text: "STATUS", options: headerOptions() },
  ];

  const rows: PptxGenJS.TableRow[] = chunk.map(
    (project): PptxGenJS.TableCell[] => [
      {
        text: clean(project.chamadoTopDesk) || "—",
        options: { fontFace: FONT, fontSize: 9, color: C.muted, valign: "middle", margin: 0.05 },
      },
      {
        text: clean(project.tipo) || "—",
        options: { fontFace: FONT, fontSize: 9, color: C.slate, valign: "middle", margin: 0.05 },
      },
      {
        text: clean(project.nome) || `Projeto ${project.id}`,
        options: {
          fontFace: FONT,
          fontSize: 9,
          bold: true,
          color: C.primary,
          underline: { style: "sng" },
          hyperlink: { url: projectUrl(project), tooltip: "Abrir a lâmina do projeto" },
          valign: "middle",
          margin: 0.05,
        },
      },
      {
        text: clean(project.fase) || "—",
        options: { fontFace: FONT, fontSize: 9, color: C.slate, valign: "middle", margin: 0.05 },
      },
      {
        text: formatPercent(project.avancoPrevisto),
        options: {
          fontFace: FONT,
          fontSize: 9,
          color: C.muted,
          align: "center",
          valign: "middle",
          margin: 0.05,
        },
      },
      {
        text: formatPercent(project.avancoReal),
        options: {
          fontFace: FONT,
          fontSize: 9,
          bold: true,
          color: C.slate,
          align: "center",
          valign: "middle",
          margin: 0.05,
        },
      },
      drawStatusCell(project),
    ]
  );

  slide.addTable([headerRow, ...rows], {
    x: MARGIN,
    y: isFirst ? 1.42 : 1.02,
    w: CONTENT_W,
    colW: [0.82, 1.0, 3.46, 1.35, 0.72, 0.72, 1.13],
    rowH: 0.29,
    border: { type: "solid", pt: 0.75, color: C.border },
    fill: { color: C.surface },
    fontFace: FONT,
    fontSize: 9,
    color: C.slate,
    valign: "middle",
    autoPage: false,
  });

  if (isLast) {
    addText(slide, "Projetos com atraso ou em atenção exigem acompanhamento na semana.", {
      x: MARGIN,
      y: 5.0,
      w: CONTENT_W,
      h: 0.16,
      fontSize: 6.5,
      italic: true,
      color: C.muted,
    });
  }
}

/* ---------------------- Seção 3 — lâmina do projeto ----------------------- */

function documentStatus(project: Project, aliases: string[]): BinaryStatus {
  for (const alias of aliases) {
    const document = project.documentos[alias];
    if (document) return document.status;
  }
  return "A_DEFINIR";
}

function addInfoBox(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
): void {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.headerBg },
    line: { color: C.border, width: 0.75 },
  });
  addText(slide, label, {
    x: x + 0.1,
    y: y + 0.08,
    w: w - 0.2,
    h: 0.14,
    fontSize: 5.7,
    bold: true,
    color: C.muted,
    charSpacing: 0.4,
  });
  addText(slide, value, {
    x: x + 0.1,
    y: y + 0.23,
    w: w - 0.2,
    h: 0.24,
    fontSize: 8,
    bold: true,
    color: C.slate,
  });
}

function addSectionCard(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  options: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
  }
): { bodyX: number; bodyY: number; bodyW: number; bodyH: number } {
  const { x, y, w, h, title } = options;
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.surface },
    line: { color: C.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.27,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
  addText(slide, title, {
    x: x + 0.12,
    y: y + 0.06,
    w: w - 0.24,
    h: 0.16,
    fontSize: 8.5,
    bold: true,
    color: C.surface,
    charSpacing: 0.7,
  });
  return { bodyX: x + 0.13, bodyY: y + 0.34, bodyW: w - 0.26, bodyH: h - 0.42 };
}

function buildProjectSlide(
  pptx: PptxGenJS,
  project: Project,
  pmoSlideNumber: number | null
): void {
  const slide = pptx.addSlide();
  addContentBase(
    pptx,
    slide,
    "ACOMPANHAMENTO SEMANAL · LÂMINA DO PROJETO",
    `ID ${project.id} · ${clean(project.chamadoTopDesk) || "Sem chamado vinculado"}`,
    false
  );

  // Título do projeto.
  addText(slide, clean(project.nome) || `Projeto ${project.id}`, {
    x: MARGIN,
    y: 0.92,
    w: CONTENT_W - 1.5,
    h: 0.36,
    fontSize: 19,
    bold: true,
    color: C.slate,
  });

  // Pílula de status.
  const statusWidth = 1.28;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: PAGE_W - MARGIN - statusWidth,
    y: 0.96,
    w: statusWidth,
    h: 0.28,
    fill: { color: STATUS_TINT[project.status] },
    line: { color: STATUS_COLOR[project.status], width: 1 },
    rectRadius: 0.14,
  });
  addText(slide, STATUS_LABEL[project.status], {
    x: PAGE_W - MARGIN - statusWidth,
    y: 0.96,
    w: statusWidth,
    h: 0.28,
    fontSize: 7.5,
    bold: true,
    color: STATUS_COLOR[project.status],
    align: "center",
    valign: "middle",
  });

  // 6 caixas de informação.
  const infoY = 1.38;
  const infoH = 0.58;
  const infoGap = 0.07;
  const infoW = (CONTENT_W - infoGap * 5) / 6;
  const infoItems: Array<{ label: string; value: string }> = [
    { label: "SPONSOR", value: clean(project.sponsor) || "—" },
    { label: "LÍDER", value: clean(project.lider) || "—" },
    { label: "PMO", value: clean(project.pmo) || "—" },
    { label: "FASE", value: clean(project.fase) || "—" },
    {
      label: "INÍCIO",
      value: project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir",
    },
    {
      label: "PREV. TÉRMINO",
      value: project.previsaoGoLive ? formatDateBR(project.previsaoGoLive) : "A definir",
    },
  ];
  infoItems.forEach((item, index) => {
    addInfoBox(
      pptx,
      slide,
      MARGIN + index * (infoW + infoGap),
      infoY,
      infoW,
      infoH,
      item.label,
      item.value
    );
  });

  // Bloco do meio: resumo e impedimentos.
  const midY = 2.08;
  const midH = 1.03;
  const midGap = 0.14;
  const midW = (CONTENT_W - midGap) / 2;
  const summary = addSectionCard(pptx, slide, {
    x: MARGIN,
    y: midY,
    w: midW,
    h: midH,
    title: "RESUMO EXECUTIVO",
  });
  addText(slide, clean(project.resumoExecutivo) || "Sem atualização registrada.", {
    x: summary.bodyX,
    y: summary.bodyY,
    w: summary.bodyW,
    h: summary.bodyH,
    fontSize: 9,
    color: C.slate,
    valign: "top",
    lineSpacingMultiple: 1.08,
  });

  const impediments = addSectionCard(pptx, slide, {
    x: MARGIN + midW + midGap,
    y: midY,
    w: midW,
    h: midH,
    title: "IMPEDIMENTOS",
  });
  addText(slide, clean(project.impedimentos) || "Nenhum impedimento registrado.", {
    x: impediments.bodyX,
    y: impediments.bodyY,
    w: impediments.bodyW,
    h: impediments.bodyH,
    fontSize: 9,
    color: C.slate,
    valign: "top",
    lineSpacingMultiple: 1.08,
  });

  // Bloco de baixo: tarefas críticas e governança.
  const bottomY = 3.2;
  const bottomH = 1.98;
  const tasks = addSectionCard(pptx, slide, {
    x: MARGIN,
    y: bottomY,
    w: midW,
    h: bottomH,
    title: "TAREFAS CRÍTICAS",
  });
  const criticalTasks = project.tarefasPriorizadas
    .map((task) => clean(task))
    .filter((task) => task.length > 0)
    .slice(0, 5);

  if (criticalTasks.length === 0) {
    addText(slide, "Nenhuma tarefa priorizada registrada.", {
      x: tasks.bodyX,
      y: tasks.bodyY + 0.05,
      w: tasks.bodyW,
      h: 0.24,
      fontSize: 8,
      color: C.muted,
    });
  } else {
    criticalTasks.forEach((task, index) => {
      const taskY = tasks.bodyY + index * 0.29;
      slide.addText("\u25CF", {
        x: tasks.bodyX,
        y: taskY,
        w: 0.13,
        h: 0.18,
        fontFace: FONT,
        fontSize: 6,
        color: C.accent,
        margin: 0,
      });
      addText(slide, task, {
        x: tasks.bodyX + 0.17,
        y: taskY,
        w: tasks.bodyW - 0.17,
        h: 0.24,
        fontSize: 9,
        color: C.slate,
      });
    });
  }

  const governance = addSectionCard(pptx, slide, {
    x: MARGIN + midW + midGap,
    y: bottomY,
    w: midW,
    h: bottomH,
    title: "GOVERNANÇA / ARTEFATOS",
  });

  const docColumnW = governance.bodyW / 2;
  const docRowH = 0.215;
  DOCUMENTS.forEach((definition, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = governance.bodyX + column * docColumnW;
    const y = governance.bodyY + row * docRowH;
    const status = documentStatus(project, definition.aliases);
    const color = status === "SIM" ? C.accent : C.red;
    slide.addText("\u25CF", {
      x,
      y,
      w: 0.12,
      h: 0.17,
      fontFace: FONT,
      fontSize: 6,
      color,
      margin: 0,
    });
    addText(slide, definition.label, {
      x: x + 0.14,
      y,
      w: docColumnW - 0.18,
      h: 0.18,
      fontSize: 8,
      color: C.slate,
    });
  });

  // Rodapé: link para o PMO e origem/dados.
  if (pmoSlideNumber !== null) {
    slide.addText(`← Voltar ao acompanhamento PMO ${clean(project.pmo)}`, {
      x: MARGIN,
      y: PAGE_H - 0.26,
      w: 4.5,
      h: 0.16,
      fontFace: FONT,
      fontSize: 6.5,
      color: C.primary,
      underline: { style: "sng" },
      hyperlink: {
        slide: pmoSlideNumber,
        tooltip: `Voltar ao acompanhamento do PMO ${clean(project.pmo)}`,
      },
      margin: 0,
      fit: "shrink",
    });
  } else {
    addText(slide, `PMO ${clean(project.pmo) || "não atribuído"}`, {
      x: MARGIN,
      y: PAGE_H - 0.24,
      w: 4.5,
      h: 0.16,
      fontSize: 6.5,
      color: C.muted,
    });
  }

  const updateDate = project.ultimaAtualizacaoPlanner
    ? formatDateBR(project.ultimaAtualizacaoPlanner)
    : reportDate();
  addText(
    slide,
    `Chamado: ${clean(project.chamadoTopDesk) || "—"} • Fonte: Status dos Projetos • atualização de ${updateDate}`,
    {
      x: PAGE_W - MARGIN - 4.8,
      y: PAGE_H - 0.26,
      w: 4.8,
      h: 0.16,
      fontSize: 5.8,
      color: C.grey,
      align: "right",
    }
  );
}

/* ---------------------------------- API ---------------------------------- */

/**
 * Gera o PPTX executivo no padrão oficial do PMO.
 * A apresentação é 16:9 e o download acontece inteiramente no navegador.
 */
export async function exportPPTX(projects: Project[]): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Portal PMO Unimed Campo Grande";
  pptx.company = "Unimed Campo Grande";
  pptx.subject = "Acompanhamento Semanal de Projetos";
  pptx.title = "Acompanhamento Semanal de Projetos";
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  // Seção 1 — capa e visão geral (slides 1–5).
  buildCover(pptx, projects);

  buildPhaseSlide(pptx, projects, {
    title: "Projetos por Fase | Total",
    phases: TOTAL_PHASES,
    resolver: totalPhase,
    leftValue: projects.length,
    leftCaption: "Total de Projetos",
    leftEyebrow: "PORTFÓLIO",
  });

  const strategicProjects = projects.filter((project) => tipoCategory(project) === "Estratégico");
  buildPhaseSlide(pptx, strategicProjects, {
    title: "Projetos por Fase | Estratégico",
    category: "Estratégico",
    phases: CATEGORY_PHASES,
    resolver: categoryPhase,
    leftValue: strategicProjects.length,
    leftCaption: "Projetos",
    leftEyebrow: "ESTRATÉGICO",
  });

  const tacticalProjects = projects.filter((project) => tipoCategory(project) === "Tático");
  buildPhaseSlide(pptx, tacticalProjects, {
    title: "Projetos por Fase | Tático",
    category: "Tático",
    phases: CATEGORY_PHASES,
    resolver: categoryPhase,
    leftValue: tacticalProjects.length,
    leftCaption: "Projetos",
    leftEyebrow: "TÁTICO",
  });

  const actionProjects = projects.filter((project) => tipoCategory(project) === "Plano de Ação");
  buildPhaseSlide(pptx, actionProjects, {
    title: "Projetos por Fase | Plano de Ação",
    category: "Plano de Ação",
    phases: ACTION_PHASES,
    resolver: actionPhase,
    leftValue: actionProjects.length,
    leftCaption: "Projetos",
    leftEyebrow: "PLANO DE AÇÃO",
  });

  // Seção 2 — slides por PMO. Mantém a sequência e pagina tabelas longas.
  const pmos = getAllPmos(projects);
  const pmoPlans: PmoSlidePlan[] = [];
  let nextSlideNumber = 6; // Os cinco primeiros slides já foram criados.

  for (const pmo of pmos) {
    const pmoProjects = projects.filter((project) => pmoName(project) === pmo);
    const chunks: Project[][] = [];
    if (pmoProjects.length === 0) {
      chunks.push([]);
    } else {
      for (let index = 0; index < pmoProjects.length; index += MAX_TABLE_ROWS) {
        chunks.push(pmoProjects.slice(index, index + MAX_TABLE_ROWS));
      }
    }
    const plan: PmoSlidePlan = {
      pmo,
      projects: pmoProjects,
      firstSlideNumber: nextSlideNumber,
      chunks,
    };
    pmoPlans.push(plan);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      buildPmoSlide(pptx, plan, chunkIndex);
      nextSlideNumber += 1;
    }
  }

  // Seção 3 — uma lâmina completa por projeto.
  for (const project of projects) {
    const pmoPlan = pmoPlans.find((plan) => plan.pmo === pmoName(project));
    buildProjectSlide(pptx, project, pmoPlan?.firstSlideNumber ?? null);
  }

  await pptx.writeFile({
    fileName: `Apresentacao_PMO_${todayIso()}.pptx`,
    compression: true,
  });
}

export default exportPPTX;
