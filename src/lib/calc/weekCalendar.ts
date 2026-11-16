import {
  addDays,
  format,
  getDate,
  getDaysInMonth,
  getDay,
  getMonth,
  getYear,
  parseISO,
  startOfWeek,
} from "date-fns";

export interface WeekInfo {
  year: number;
  month: number;
  week: number;
  weekStart: string;
  weekEnd: string;
}

export type ChangeLogSource = "seed" | "prompt" | "planner";

/**
 * Registro de alteração do projeto. Os campos de semana são gravados no
 * momento da alteração — nunca recalculados em tempo de leitura.
 * `origem` permanece para compatibilidade com a lâmina do projeto.
 */
export interface ChangeLogEntry extends WeekInfo {
  id: string;
  data: string;
  descricao: string;
  source: ChangeLogSource;
  origem: string;
}

/**
 * Semana útil = segunda a sexta. A semana pertence ao mês da sua
 * quarta-feira, que representa a maioria dos dias úteis da semana.
 */
export function getWeekForDate(date: Date): WeekInfo {
  const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
  const weekEndDate = addDays(weekStartDate, 4);
  const wednesday = addDays(weekStartDate, 2);

  const year = getYear(wednesday);
  const month = getMonth(wednesday) + 1;
  const week = Math.ceil(getDate(wednesday) / 7);

  return {
    year,
    month,
    week,
    weekStart: format(weekStartDate, "yyyy-MM-dd"),
    weekEnd: format(weekEndDate, "yyyy-MM-dd"),
  };
}

/**
 * Lista as semanas de um mês pela quarta-feira. Uma semana só pertence ao
 * mês quando sua quarta-feira cai nele, inclusive quando a segunda ou a
 * sexta caem no mês adjacente.
 */
export function listWeeksForMonth(year: number, month: number): WeekInfo[] {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }

  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const weeks: WeekInfo[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cursor = new Date(year, month - 1, day);
    if (getDay(cursor) !== 3) continue;

    const weekStartDate = addDays(cursor, -2);
    const weekEndDate = addDays(cursor, 2);

    weeks.push({
      year,
      month,
      week: Math.ceil(getDate(cursor) / 7),
      weekStart: format(weekStartDate, "yyyy-MM-dd"),
      weekEnd: format(weekEndDate, "yyyy-MM-dd"),
    });
  }

  return weeks.sort((a, b) => a.week - b.week);
}

/** Ex.: "S1 (30/11 – 04/12)" — sem ano, pois o filtro de ano já está visível. */
export function formatWeekLabel(week: WeekInfo): string {
  const start = format(parseISO(week.weekStart), "dd/MM");
  const end = format(parseISO(week.weekEnd), "dd/MM");
  return `S${week.week} (${start} \u2013 ${end})`;
}
