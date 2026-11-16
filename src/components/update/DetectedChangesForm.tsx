import { useState } from "react";
import { ChevronRight, Info, Plus, Trash2, X } from "lucide-react";
import {
  fromInputValue,
  getFieldGroups,
  isSameValue,
  toInputValue,
  type ChangeDraft,
  type FieldValue,
} from "@/lib/updateFields";
import { formatFieldValue } from "@/lib/updateFields";
import { cn } from "@/utils/cn";

interface DetectedChangesFormProps {
  drafts: ChangeDraft[];
  source: "prompt" | "planner";
  defaultAddingOpen?: boolean;
  onChange: (id: string, patch: { newValue?: FieldValue; selected?: boolean }) => void;
  onRemove: (id: string) => void;
  onAddField: (key: string) => void;
  onConfirm: () => void;
}

const inputClassName =
  "h-9 w-full min-w-0 rounded-sm border border-border bg-surface px-2.5 text-[11.5px] text-text shadow-sm outline-none transition-colors focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10";

export function DetectedChangesForm({
  drafts,
  source,
  defaultAddingOpen = false,
  onChange,
  onRemove,
  onAddField,
  onConfirm,
}: DetectedChangesFormProps) {
  const [isAdding, setIsAdding] = useState(defaultAddingOpen);
  const [selectedField, setSelectedField] = useState("");

  const groups = getFieldGroups();
  const availableGroups = groups
    .map((group) => ({
      group: group.group,
      fields: group.fields.filter(
        (field) => !drafts.some((draft) => draft.key === field.key)
      ),
    }))
    .filter((group) => group.fields.length > 0);

  const selectedCount = drafts.filter(
    (draft) => draft.selected && !isSameValue(draft, draft.currentValue, draft.newValue)
  ).length;

  function handleAdd() {
    if (!selectedField) return;
    onAddField(selectedField);
    setSelectedField("");
    setIsAdding(false);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.02em] text-text">
            Alterações detectadas — confirme ou ajuste
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-text2">
            {source === "planner"
              ? "Valores calculados por horas no Planner. Revise antes de aplicar."
              : "Valores extraídos do prompt. Desmarque o que não deve entrar no diff."}
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 text-[10px] font-semibold tabular-nums text-brand-700">
          {drafts.length} {drafts.length === 1 ? "campo" : "campos"}
        </span>
      </header>

      <div className="mt-3 flex items-start gap-2 rounded-sm border border-border bg-bg/60 px-3 py-2">
        <Info size={12} className="mt-0.5 shrink-0 text-text2" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-text2">
          Campos com valor igual ao atual são marcados como “sem mudança” e não entram no prompt.
          Percentuais são editados em pontos percentuais (ex.: 74,1).
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th scope="col" className="w-9 px-2.5 py-2">
                <span className="sr-only">Incluir</span>
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
              <th
                scope="col"
                className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
              >
                Novo valor (editável)
              </th>
              <th scope="col" className="w-9 px-2.5 py-2">
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => {
              const same = isSameValue(draft, draft.currentValue, draft.newValue);
              return (
                <tr
                  key={draft.id}
                  className={cn(
                    "border-b border-border/70 align-top transition-colors last:border-b-0",
                    same ? "bg-bg/30" : draft.selected ? "bg-brand-50/25" : "bg-transparent"
                  )}
                >
                  <td className="px-2.5 py-3">
                    <input
                      type="checkbox"
                      checked={draft.selected && !same}
                      disabled={same}
                      onChange={(event) =>
                        onChange(draft.id, { selected: event.target.checked })
                      }
                      aria-label={`Incluir ${draft.label}`}
                      className="mt-0.5 h-3.5 w-3.5 accent-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </td>

                  <td className="max-w-[210px] px-2.5 py-3">
                    <p className="text-[11.5px] font-semibold leading-snug text-text">
                      {draft.label}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-text2">{draft.group}</p>
                    {same ? (
                      <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.06em] text-text2">
                        Sem mudança
                      </p>
                    ) : null}
                  </td>

                  <td className="max-w-[240px] px-2.5 py-3 text-[11.5px] tabular-nums text-text2">
                    <span
                      className={cn(
                        "block",
                        draft.kind === "text" ? "line-clamp-3 leading-relaxed" : "whitespace-nowrap"
                      )}
                      title={formatFieldValue(draft, draft.currentValue)}
                    >
                      {formatFieldValue(draft, draft.currentValue)}
                    </span>
                  </td>

                  <td className="min-w-[190px] max-w-[280px] px-2.5 py-3">
                    {draft.kind === "percent" ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="100"
                          value={toInputValue(draft, draft.newValue)}
                          onChange={(event) =>
                            onChange(draft.id, {
                              newValue: fromInputValue(draft, event.target.value),
                            })
                          }
                          aria-label={`Novo valor de ${draft.label} em percentual`}
                          className={cn(inputClassName, "max-w-[120px] tabular-nums")}
                        />
                        <span className="text-[11px] font-medium text-text2">%</span>
                      </div>
                    ) : draft.kind === "date" ? (
                      <input
                        type="date"
                        value={toInputValue(draft, draft.newValue)}
                        onChange={(event) =>
                          onChange(draft.id, {
                            newValue: fromInputValue(draft, event.target.value),
                          })
                        }
                        aria-label={`Novo valor de ${draft.label}`}
                        className={cn(inputClassName, "max-w-[170px]")}
                      />
                    ) : draft.kind === "status" ? (
                      <select
                        value={toInputValue(draft, draft.newValue)}
                        onChange={(event) =>
                          onChange(draft.id, {
                            newValue: fromInputValue(draft, event.target.value),
                          })
                        }
                        aria-label={`Novo valor de ${draft.label}`}
                        className={cn(inputClassName, "max-w-[150px]")}
                      >
                        <option value="SIM">SIM</option>
                        <option value="NAO">NÃO</option>
                        <option value="NA">N/A</option>
                        <option value="A_DEFINIR">A definir</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={toInputValue(draft, draft.newValue)}
                        onChange={(event) =>
                          onChange(draft.id, {
                            newValue: fromInputValue(draft, event.target.value),
                          })
                        }
                        aria-label={`Novo valor de ${draft.label}`}
                        className={inputClassName}
                      />
                    )}
                  </td>

                  <td className="px-2.5 py-3">
                    <button
                      type="button"
                      onClick={() => onRemove(draft.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-sm text-text2/60 transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                      aria-label={`Remover ${draft.label}`}
                    >
                      <Trash2 size={12.5} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isAdding ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-md border border-brand-100 bg-brand-50/40 p-3">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="manual-field"
              className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-text2"
            >
              Campo atualizável
            </label>
            <select
              id="manual-field"
              value={selectedField}
              onChange={(event) => setSelectedField(event.target.value)}
              className={cn(inputClassName, "bg-surface")}
              autoFocus
            >
              <option value="">Selecione um campo...</option>
              {availableGroups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.fields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedField}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-brand-700 px-3 text-[11px] font-semibold text-white transition-colors enabled:hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setSelectedField("");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-[11px] font-semibold text-text2 transition-colors hover:text-text"
          >
            <X size={12} aria-hidden="true" />
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
        >
          <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
          Adicionar campo manualmente
        </button>
      )}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-4">
        <p className="text-[10.5px] text-text2">
          <strong className="font-semibold tabular-nums text-text">{selectedCount}</strong> de{" "}
          {drafts.length} campos selecionados para o diff.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={drafts.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors enabled:hover:border-brand-800 enabled:hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Ver diff e aplicar
          <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
