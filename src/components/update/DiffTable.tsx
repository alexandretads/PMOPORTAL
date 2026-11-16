import { AlertTriangle, ArrowRight, CheckCircle2, GitCompareArrows, Trash2 } from "lucide-react";
import {
  formatFieldValue,
  isSameValue,
  type ChangeDraft,
} from "@/lib/updateFields";
import { cn } from "@/utils/cn";

interface DiffTableProps {
  drafts: ChangeDraft[];
  onToggle: (id: string, selected: boolean) => void;
  onApply: () => void;
  onDiscard: () => void;
}

function situationOf(draft: ChangeDraft): "same" | "change" | "divergence" {
  if (isSameValue(draft, draft.currentValue, draft.newValue)) return "same";
  if (
    draft.key === "avancoPrevisto" &&
    typeof draft.currentValue === "number" &&
    typeof draft.newValue === "number" &&
    Math.abs(draft.newValue - draft.currentValue) > 0.005
  ) {
    return "divergence";
  }
  return "change";
}

export function DiffTable({ drafts, onToggle, onApply, onDiscard }: DiffTableProps) {
  const eligible = drafts.filter(
    (draft) => !isSameValue(draft, draft.currentValue, draft.newValue)
  );
  const selected = eligible.filter((draft) => draft.selected);
  const divergences = drafts.filter((draft) => situationOf(draft) === "divergence");
  const selectedDivergence = divergences.find((draft) => draft.selected) ?? divergences[0];
  const allSame = drafts.length > 0 && eligible.length === 0;

  return (
    <section
      aria-labelledby="diff-title"
      className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="diff-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <GitCompareArrows size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Diff preview
          </h2>
          <p className="mt-1 text-[11.5px] text-text2">
            Confira campo a campo. Somente linhas marcadas entram no prompt final.
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 text-[10px] font-semibold tabular-nums text-brand-700">
          {selected.length} selecionada{selected.length === 1 ? "" : "s"}
        </span>
      </header>

      {allSame ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-border bg-bg px-3.5 py-3"
        >
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-text2" aria-hidden="true" />
          <div>
            <p className="text-[12px] font-semibold text-text">
              Nenhuma alteração detectada — o projeto já está atualizado.
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-text2">
              Os valores propostos são iguais aos atuais. Nada será aplicado nem incluído no prompt.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th scope="col" className="w-9 px-2.5 py-2">
                <span className="sr-only">Selecionar</span>
              </th>
              <th
                scope="col"
                className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
              >
                Campo
              </th>
              <th
                scope="col"
                className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
              >
                Valor atual
              </th>
              <th scope="col" className="w-8 px-1 py-2">
                <span className="sr-only">Para</span>
              </th>
              <th
                scope="col"
                className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
              >
                Novo valor
              </th>
              <th
                scope="col"
                className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
              >
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => {
              const situation = situationOf(draft);
              const isSame = situation === "same";
              return (
                <tr
                  key={draft.id}
                  className={cn(
                    "border-b border-border/70 transition-colors last:border-b-0",
                    isSame
                      ? "bg-bg/40 text-text2"
                      : draft.selected
                        ? "bg-brand-50/25"
                        : "bg-surface"
                  )}
                >
                  <td className="px-2.5 py-3">
                    <input
                      type="checkbox"
                      checked={draft.selected && !isSame}
                      disabled={isSame}
                      onChange={(event) => onToggle(draft.id, event.target.checked)}
                      aria-label={`Incluir ${draft.label} no prompt final`}
                      className="h-3.5 w-3.5 accent-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                    />
                  </td>

                  <td className="max-w-[210px] px-2.5 py-3">
                    <p className={cn("text-[11.5px] font-semibold leading-snug", isSame ? "text-text2" : "text-text")}>
                      {draft.label}
                    </p>
                    <p className="mt-0.5 text-[9px] text-text2">{draft.group}</p>
                  </td>

                  <td className="max-w-[240px] px-2.5 py-3 text-[11.5px] tabular-nums text-text2">
                    <span
                      className={cn(
                        "block",
                        draft.kind === "text" ? "line-clamp-2 leading-relaxed" : "whitespace-nowrap"
                      )}
                      title={formatFieldValue(draft, draft.currentValue)}
                    >
                      {formatFieldValue(draft, draft.currentValue)}
                    </span>
                  </td>

                  <td className="px-1 py-3 text-center">
                    <ArrowRight
                      size={11}
                      className={isSame ? "text-text2/30" : "text-brand-500"}
                      aria-hidden="true"
                    />
                  </td>

                  <td className="max-w-[240px] px-2.5 py-3 text-[12px] font-semibold tabular-nums text-text">
                    <span
                      className={cn(
                        "block",
                        draft.kind === "text" ? "line-clamp-2 leading-relaxed" : "whitespace-nowrap"
                      )}
                      title={formatFieldValue(draft, draft.newValue)}
                    >
                      {formatFieldValue(draft, draft.newValue)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-2.5 py-3">
                    {situation === "same" ? (
                      <span className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.05em] text-text2">
                        sem mudança
                      </span>
                    ) : situation === "divergence" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-warn/20 bg-status-warn/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.05em] text-status-warn">
                        <AlertTriangle size={9} strokeWidth={2.4} aria-hidden="true" />
                        divergência
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.05em] text-brand-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                        alterar
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDivergence ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-status-warn/25 bg-status-warn/[0.07] px-3.5 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <div>
            <p className="text-[11.5px] font-semibold text-text">Divergência detectada</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-text2">
              O Avanço Previsto recalculado por horas (
              <strong className="font-semibold text-text">
                {formatFieldValue(selectedDivergence, selectedDivergence.newValue)}
              </strong>
              ) difere do valor da planilha (
              <strong className="font-semibold text-text">
                {formatFieldValue(selectedDivergence, selectedDivergence.currentValue)}
              </strong>
              ). O valor da planilha usava contagem de tarefas.{" "}
              <strong className="font-semibold text-text">
                Ação sugerida: substituir pelo valor por horas.
              </strong>
            </p>
          </div>
        </div>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-4">
        <p className="text-[10.5px] text-text2">
          <strong className="font-semibold tabular-nums text-text">{selected.length}</strong> de{" "}
          {drafts.length} alterações selecionadas
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-transparent px-3 text-[11px] font-semibold text-text2 transition-colors hover:border-border hover:bg-bg hover:text-text"
          >
            <Trash2 size={12.5} strokeWidth={1.9} aria-hidden="true" />
            Descartar
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={selected.length === 0}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors enabled:hover:border-brand-800 enabled:hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Aplicar no site (preview)
          </button>
        </div>
      </footer>
    </section>
  );
}
