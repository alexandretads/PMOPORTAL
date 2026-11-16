import { useState } from "react";
import { AlertTriangle, ClipboardPaste, ScanText, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";

interface PromptInputPanelProps {
  onAnalyze: (text: string) => void;
  error: string | null;
  warning: string | null;
  hasDrafts: boolean;
}

const PLACEHOLDER = `Atualize a planilha de Status Report atualmente aberta. Use somente a aba "NovS1". Localize o projeto pelo ID 24 e confirme o nome "Cadeia de Suprimentos".

ALTERAÇÕES AUTORIZADAS
- Coluna: Avanço Real %
  Valor anterior esperado: 73,8%
  Novo valor: 74,1%
- Coluna: Avanço previsto
  Valor anterior esperado: 76,7%
  Novo valor: 79,2%
- Coluna: Resumo executivo
  Valor anterior esperado: "..."
  Novo valor: "Pendências em rastreabilidade e Data Matrix."`;

export function PromptInputPanel({
  onAnalyze,
  error,
  warning,
  hasDrafts,
}: PromptInputPanelProps) {
  const [text, setText] = useState("");
  const canAnalyze = text.trim().length >= 20;

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text">
            <ClipboardPaste size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Receber prompt do Atualizador
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-text2">
            Cole o prompt gerado pelo agente. Vamos extrair apenas as alterações reconhecidas.
          </p>
        </div>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-bg px-2 text-[9.5px] font-semibold text-text2">
          <Sparkles size={10} strokeWidth={2} aria-hidden="true" />
          Extração local
        </span>
      </header>

      <div className="mt-4">
        <label
          htmlFor="prompt-atualizador"
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-text2"
        >
          Cole aqui o prompt gerado pelo Atualizador de Status
        </label>
        <textarea
          id="prompt-atualizador"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "prompt-error" : undefined}
          placeholder={PLACEHOLDER}
          className={cn(
            "w-full resize-y rounded-sm border bg-bg/40 px-3.5 py-3 font-mono text-[12px] leading-[1.65] text-text outline-none transition-colors placeholder:text-text2/55",
            error
              ? "border-status-danger/40 focus:border-status-danger focus:ring-2 focus:ring-status-danger/10"
              : "border-border focus:border-brand-500/50 focus:bg-surface focus:ring-2 focus:ring-brand-500/10"
          )}
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-[10px] text-text2">
            Formatos aceitos: blocos “Coluna / Novo valor” e pares “Campo: valor”.
          </p>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-text2">
            {text.length} caracteres
          </span>
        </div>
      </div>

      {error ? (
        <div
          id="prompt-error"
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-sm border border-status-danger/20 bg-status-danger/[0.06] px-3 py-2.5"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-danger" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-status-danger">{error}</p>
        </div>
      ) : null}

      {warning ? (
        <div
          role="status"
          className="mt-3 flex items-start gap-2.5 rounded-sm border border-status-warn/20 bg-status-warn/[0.07] px-3 py-2.5"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-warn" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-text">{warning}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[10.5px] text-text2">
          {hasDrafts
            ? "Alterações detectadas. Confirme os valores abaixo antes de gerar o diff."
            : "Nada é gravado no arquivo Excel original."}
        </p>
        <button
          type="button"
          onClick={() => onAnalyze(text)}
          disabled={!canAnalyze}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors enabled:hover:border-brand-800 enabled:hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ScanText size={14} strokeWidth={2} aria-hidden="true" />
          Analisar prompt
          <span aria-hidden="true">▸</span>
        </button>
      </div>
    </section>
  );
}
