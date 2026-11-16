import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import type { PlannerPlan, Project } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { calcularAvanco } from "@/lib/calc/calcularAvanco";
import { formatDateBR } from "@/lib/format";
import type { FieldValuePair } from "@/lib/updateFields";
import { cn } from "@/utils/cn";

export interface PlannerCalculationSummary {
  planName: string;
  owner: string;
  exportedAt: string;
  planCompletion: number;
  bucket: string;
  dataCorte: string;
  taskCount: number;
  horasTotal: number;
  horasReal: number;
  horasPrevistas: number;
}

export interface PlannerCalculationResult {
  changes: FieldValuePair[];
  summary: PlannerCalculationSummary;
}

interface PlannerUploadPanelProps {
  project: Project;
  onCalculated: (result: PlannerCalculationResult) => void;
}

const INVALID_PLANNER_MESSAGE =
  'O arquivo não parece ser um export válido do Planner. Verifique se contém a coluna "Número de tarefa".';

const EXCLUDED_BUCKETS = ["gestão pmo", "gestao pmo", "gestão de rotina", "gestao de rotina", "encerramento"];

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatHours(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function roundPercentage(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round((value / 100) * 1000) / 1000;
}

function bucketCount(plan: PlannerPlan | null, bucket: string): number {
  if (!plan) return 0;
  return plan.tarefas.filter((task) => task.bucket.trim() === bucket).length;
}

export function PlannerUploadPanel({ project, onCalculated }: PlannerUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importPlannerFile = usePortfolioStore((state) => state.importPlannerFile);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cutDate, setCutDate] = useState(todayIso());
  const [bucket, setBucket] = useState("");
  const [calculated, setCalculated] = useState<PlannerCalculationSummary | null>(null);

  async function handleFile(nextFile: File | undefined) {
    if (!nextFile) return;

    if (!/\.(xlsx|xls)$/i.test(nextFile.name)) {
      setFile(null);
      setPlan(null);
      setBucket("");
      setParseError("Envie um arquivo Excel do Planner (.xlsx ou .xls).");
      return;
    }

    setFile(nextFile);
    setPlan(null);
    setBucket("");
    setCalculated(null);
    setParseError(null);
    setNotice(null);
    setIsParsing(true);

    try {
      const result = await importPlannerFile(nextFile);
      if (!result.ok || !result.plan) {
        setParseError(result.error ?? INVALID_PLANNER_MESSAGE);
        return;
      }
      const parsed = result.plan;

      if (parsed.buckets.length === 0 && parsed.tarefas.length === 0) {
        setNotice("O arquivo do Planner não contém tarefas-folha com bucket.");
        return;
      }

      const orderedBuckets = [...parsed.buckets].sort((a, b) => {
        const aExcluded = EXCLUDED_BUCKETS.includes(a.toLowerCase());
        const bExcluded = EXCLUDED_BUCKETS.includes(b.toLowerCase());
        if (aExcluded !== bExcluded) return aExcluded ? 1 : -1;
        return a.localeCompare(b, "pt-BR");
      });
      const preferred =
        orderedBuckets.find(
          (candidate) =>
            project.nome.length > 0 &&
            candidate.toLowerCase().includes(project.nome.toLowerCase())
        ) ??
        orderedBuckets.find(
          (candidate) => !EXCLUDED_BUCKETS.includes(candidate.toLowerCase())
        ) ??
        orderedBuckets[0] ??
        "";

      setPlan(parsed);
      setBucket(preferred);
      if (orderedBuckets.length === 0) {
        setNotice("Nenhum bucket com tarefas-folha foi encontrado no export do Planner.");
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : INVALID_PLANNER_MESSAGE);
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  const eligibleTasks = bucketCount(plan, bucket);
  const canCalculate = Boolean(file && plan && bucket && cutDate && eligibleTasks > 0);
  const bucketOptions = plan
    ? [...plan.buckets].sort((a, b) => {
        const aExcluded = EXCLUDED_BUCKETS.includes(a.toLowerCase());
        const bExcluded = EXCLUDED_BUCKETS.includes(b.toLowerCase());
        if (aExcluded !== bExcluded) return aExcluded ? 1 : -1;
        return a.localeCompare(b, "pt-BR");
      })
    : [];

  function handleCalculate() {
    if (!plan || !bucket || !cutDate) return;

    const dataCorte = new Date(`${cutDate}T23:59:59`);
    if (Number.isNaN(dataCorte.getTime())) {
      setParseError("Informe uma data de corte válida.");
      return;
    }

    const avanco = calcularAvanco(plan.tarefas, bucket, dataCorte);
    if (avanco.horasTotal <= 0) {
      setNotice("O bucket selecionado não tem tarefas elegíveis.");
      setCalculated(null);
      return;
    }

    const exportedAt = format(plan.exportadoEm, "yyyy-MM-dd");
    const summary: PlannerCalculationSummary = {
      planName: plan.nomeProjeto || file?.name || project.nome,
      owner: plan.proprietario,
      exportedAt,
      planCompletion: plan.percentualConcluida,
      bucket,
      dataCorte: cutDate,
      taskCount: eligibleTasks,
      horasTotal: avanco.horasTotal,
      horasReal: avanco.horasReal,
      horasPrevistas: avanco.horasPrevistas,
    };

    setCalculated(summary);
    setParseError(null);
    setNotice(null);
    onCalculated({
      summary,
      changes: [
        { key: "avancoReal", value: roundPercentage(avanco.real) },
        { key: "avancoPrevisto", value: roundPercentage(avanco.previsto) },
        { key: "ultimaAtualizacaoPlanner", value: exportedAt },
      ],
    });
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text">
            <FileSpreadsheet size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Subir Excel do Planner
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-text2">
            Calcula Real, Previsto e Desvio por horas necessárias, dentro do bucket operacional.
          </p>
        </div>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-bg px-2 text-[9.5px] font-semibold text-text2">
          Somente leitura
        </span>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
        aria-label="Selecionar Excel do Planner"
      />

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-5 py-9 text-center transition-colors",
            isDragging
              ? "border-brand-500 bg-brand-50"
              : "border-border bg-bg/40 hover:border-brand-500/40 hover:bg-brand-50/40"
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            {isParsing ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload size={20} strokeWidth={1.8} aria-hidden="true" />
            )}
          </span>
          <p className="mt-3 text-[12.5px] font-semibold text-text">
            {isParsing ? "Lendo o Planner..." : "Arraste o Excel do Planner ou clique aqui"}
          </p>
          <p className="mt-1 text-[10.5px] text-text2">Aceita arquivos .xlsx ou .xls</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-brand-100 bg-brand-50/50 px-3.5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface text-brand-700 shadow-sm ring-1 ring-border">
            {isParsing ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet size={16} strokeWidth={1.9} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-text" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 text-[10px] text-text2">
              {formatFileSize(file.size)}
              {plan ? ` · ${plan.tarefas.length} tarefas lidas` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-[10.5px] font-semibold text-text2 transition-colors hover:border-brand-500/30 hover:text-brand-700"
          >
            <RefreshCw size={11} strokeWidth={2} aria-hidden="true" />
            Trocar arquivo
          </button>
        </div>
      )}

      {parseError ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-sm border border-status-danger/20 bg-status-danger/[0.06] px-3 py-2.5"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-danger" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-status-danger">{parseError}</p>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mt-3 flex items-start gap-2.5 rounded-sm border border-status-warn/20 bg-status-warn/[0.07] px-3 py-2.5"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-text">{notice}</p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="data-corte"
            className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-text2"
          >
            <CalendarDays size={11} strokeWidth={2} aria-hidden="true" />
            Data de corte
          </label>
          <input
            id="data-corte"
            type="date"
            value={cutDate}
            onChange={(event) => {
              setCutDate(event.target.value);
              setCalculated(null);
            }}
            className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12px] font-medium text-text shadow-sm outline-none transition-colors focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="bucket-operacional"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-text2"
          >
            Bucket operacional
          </label>
          <select
            id="bucket-operacional"
            value={bucket}
            onChange={(event) => {
              setBucket(event.target.value);
              setCalculated(null);
            }}
            disabled={!plan || bucketOptions.length === 0}
            className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12px] font-medium text-text shadow-sm outline-none transition-colors focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-bg disabled:text-text2"
          >
            <option value="">
              {plan ? "Selecione um bucket" : "Disponível após ler o arquivo"}
            </option>
            {bucketOptions.map((option) => (
              <option key={option} value={option}>
                {option} ({bucketCount(plan, option)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {plan && bucket && eligibleTasks === 0 ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-medium text-status-warn">
          <AlertTriangle size={11} strokeWidth={2.2} aria-hidden="true" />
          O bucket selecionado não tem tarefas elegíveis.
        </p>
      ) : null}

      {plan ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-sm bg-bg px-3 py-2 text-[10px] text-text2">
          <span>
            Plano: <strong className="font-medium text-text">{plan.nomeProjeto || "—"}</strong>
          </span>
          <span>
            Proprietário: <strong className="font-medium text-text">{plan.proprietario || "—"}</strong>
          </span>
          <span>
            Exportado em:{" "}
            <strong className="font-medium text-text">{formatDateBR(plan.exportadoEm)}</strong>
          </span>
          <span>
            % concluída do plano:{" "}
            <strong className="font-medium text-text">
              {(plan.percentualConcluida * 100).toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}
              %
            </strong>
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[10px] text-text2">
          Tarefas de resumo sem bucket são ignoradas no cálculo.
        </p>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={!canCalculate}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors enabled:hover:border-brand-800 enabled:hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Calcular
          <span aria-hidden="true">▸</span>
        </button>
      </div>

      {calculated ? (
        <div className="mt-4 rounded-md border border-status-ok/20 bg-status-ok/[0.045] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-ok">
              <CheckCircle2 size={13} strokeWidth={2.2} aria-hidden="true" />
              Cálculo concluído
            </p>
            <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-text2">
              {formatDateBR(calculated.dataCorte)}
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-text">
            Plano <strong className="font-semibold">{calculated.planName}</strong> ·{" "}
            {calculated.taskCount} {calculated.taskCount === 1 ? "tarefa" : "tarefas"} · Bucket{" "}
            <strong className="font-semibold">{calculated.bucket}</strong> · Horas totais:{" "}
            <strong className="font-semibold tabular-nums">{formatHours(calculated.horasTotal)}h</strong>{" "}
            · Concluídas:{" "}
            <strong className="font-semibold tabular-nums">{formatHours(calculated.horasReal)}h</strong>{" "}
            · Previstas até {formatDateBR(calculated.dataCorte)}:{" "}
            <strong className="font-semibold tabular-nums">
              {formatHours(calculated.horasPrevistas)}h
            </strong>
            .
          </p>
        </div>
      ) : null}
    </section>
  );
}
