import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Users } from "lucide-react";
import type { Project } from "@/types";
import { asText } from "@/lib/projectSchema";

interface PmoDonutProps {
  projects: Project[];
}

const PMO_COLORS = ["#006B4F", "#00A67A", "#D6F0E6", "#0891B2", "#7C3AED", "#94A3B8"];

interface DonutDatum {
  name: string;
  value: number;
  percent: number;
  color: string;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DonutDatum }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-text">{datum.name}</p>
      <p className="mt-0.5 text-[10.5px] text-text2">
        {datum.value} {datum.value === 1 ? "projeto" : "projetos"} · {datum.percent}%
      </p>
    </div>
  );
}

export function PmoDonut({ projects }: PmoDonutProps) {
  const grouped = new Map<string, number>();
  projects.forEach((project) => {
    const pmo = asText(project.pmo, "Não atribuído");
    grouped.set(pmo, (grouped.get(pmo) ?? 0) + 1);
  });

  const total = projects.length;
  const data: DonutDatum[] = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([name, value], index) => ({
      name,
      value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      color: PMO_COLORS[index % PMO_COLORS.length],
    }));

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-text">
            Distribuição por PMO
          </h2>
          <p className="mt-1 text-[12px] text-text2">Carga de projetos por gestor</p>
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <Users size={15} strokeWidth={1.9} />
        </span>
      </header>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text2">
            <Users size={22} strokeWidth={1.6} />
          </span>
          <p className="mt-3 text-[12px] font-medium text-text2">Sem projetos para exibir</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-[174px] w-full max-w-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={data.length > 1 ? 3 : 0}
                  startAngle={90}
                  endAngle={-270}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  isAnimationActive={false}
                >
                  {data.map((datum) => (
                    <Cell key={datum.name} fill={datum.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[30px] font-semibold leading-none tabular-nums text-text">
                {total}
              </span>
              <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-text2">
                {total === 1 ? "projeto" : "projetos"}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1 border-t border-border pt-3">
            {data.map((datum) => (
              <div key={datum.name} className="flex items-center gap-2.5 py-0.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: datum.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-text">
                  {datum.name}
                </span>
                <span className="text-[10.5px] tabular-nums text-text2">{datum.percent}%</span>
                <span className="w-4 text-right font-display text-[11.5px] font-semibold tabular-nums text-text">
                  {datum.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
