import type { Avanco, AvancoStatus, PlannerTask } from "@/types";

/**
 * Calcula o avanço de um bucket do Planner com base nas horas necessárias.
 *
 * Blindagens (QA adversarial):
 * - `tarefas`/`bucket` nulos ou vazios não lançam exceção;
 * - horas inválidas, negativas, `NaN` ou `Infinity` são ignoradas;
 * - `dataCorte` inválida não contamina o cálculo (previsto fica null);
 * - divisão por zero retorna null, nunca NaN/Infinity;
 * - tarefas com percentual >= 0.999 (arredondamento do Excel) contam como 100%.
 */
export function calcularAvanco(
  tarefas: PlannerTask[] | null | undefined,
  bucket: string | null | undefined,
  dataCorte: Date | null | undefined
): Avanco {
  const lista = Array.isArray(tarefas) ? tarefas : [];
  const bucketNormalizado = (bucket ?? "").trim();

  const elegiveis = bucketNormalizado
    ? lista.filter((tarefa) => (tarefa?.bucket ?? "").trim() === bucketNormalizado)
    : [];

  const horasTotal = somarHoras(elegiveis);
  const horasReal = somarHoras(
    elegiveis.filter((tarefa) => percentual(tarefa) >= 0.999)
  );
  const horasPrevistas = somarHoras(elegiveis.filter((tarefa) => concluiuAte(tarefa, dataCorte)));

  const real = horasTotal > 0 ? seguro((horasReal / horasTotal) * 100) : null;
  const hasValidCut =
    dataCorte instanceof Date && !Number.isNaN(dataCorte.getTime());
  const previsto =
    horasTotal > 0 && hasValidCut ? seguro((horasPrevistas / horasTotal) * 100) : null;
  const desvio = real !== null && previsto !== null ? seguro(real - previsto) : null;

  let status: AvancoStatus;
  if (real === null || previsto === null) {
    status = "sem_apuracao";
  } else if (real >= previsto) {
    status = "no_prazo";
  } else if (previsto - real <= 10) {
    status = "em_atencao";
  } else {
    status = "atrasado";
  }

  return { horasTotal, horasReal, horasPrevistas, real, previsto, desvio, status };
}

function somarHoras(tarefas: PlannerTask[]): number {
  const total = tarefas.reduce((accumulator, tarefa) => {
    const horas = Number(tarefa?.tempoNecessarioHoras);
    // Limite defensivo: horas absurdas (> 1 milhão) são dados corrompidos.
    const valid = Number.isFinite(horas) && horas > 0 && horas <= 1_000_000;
    return accumulator + (valid ? horas : 0);
  }, 0);
  return Number.isFinite(total) ? Math.round(total * 1000) / 1000 : 0;
}

function percentual(tarefa: PlannerTask): number {
  const raw = tarefa?.percentualConcluida as unknown;
  let value = Number(raw);
  // Aceita "100%" / "50%" vindos de futuras APIs/Supabase.
  if (typeof raw === "string" && raw.includes("%")) {
    value = Number(raw.replace("%", "").replace(",", ".").trim()) / 100;
  }
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Datas podem chegar como Date ou string (JSON/Supabase). */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    // Meio-dia local evita virada de dia por fuso.
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function concluiuAte(tarefa: PlannerTask, dataCorte: Date | null | undefined): boolean {
  const corte = dataCorte instanceof Date ? dataCorte : null;
  if (!corte || Number.isNaN(corte.getTime())) return false;
  const fim = toDate(tarefa?.concluir);
  if (!fim) return false;
  return fim.getTime() <= corte.getTime();
}

function seguro(value: number): number | null {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
