import { useMemo, useRef } from "react";
import { ArrowLeft, Clipboard, Download, FileText, ShieldCheck } from "lucide-react";
import type { Project } from "@/types";
import { buildCopilotPrompt } from "@/lib/copilotPrompt";
import type { AppliedChange } from "@/lib/updateFields";
import type { ToastVariant } from "@/components/ui/Toast";

interface CopilotPromptBoxProps {
  project: Project;
  changes: AppliedChange[];
  onBackToProject: () => void;
  onNotify: (variant: ToastVariant, title: string, description?: string) => void;
}

export function CopilotPromptBox({
  project,
  changes,
  onBackToProject,
  onNotify,
}: CopilotPromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prompt = useMemo(
    () => buildCopilotPrompt({ project, changes }),
    [project, changes]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify("success", "Prompt copiado.");
    } catch {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        if (copied) {
          onNotify("success", "Prompt copiado.");
          return;
        }
      }
      onNotify(
        "error",
        "Não foi possível copiar automaticamente.",
        "Selecione o texto do prompt e copie manualmente."
      );
    }
  }

  function handleDownload() {
    try {
      const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `prompt-copilot-projeto-${project.id}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onNotify("success", "Download iniciado.", `Arquivo prompt-copilot-projeto-${project.id}.txt`);
    } catch {
      onNotify("error", "Não foi possível baixar o arquivo.", "Tente novamente.");
    }
  }

  return (
    <section
      aria-labelledby="copilot-prompt-title"
      className="rounded-lg border border-brand-500/25 bg-surface p-5 shadow-md sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="copilot-prompt-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <FileText size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            Prompt pronto para o Copilot no Excel
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-text2">
            Gerado com os nomes exatos das colunas da aba NovS1 e somente as alterações aplicadas.
          </p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 text-[10px] font-semibold tabular-nums text-brand-700">
          {changes.length} {changes.length === 1 ? "alteração" : "alterações"}
        </span>
      </header>

      <div className="mt-3 flex items-start gap-2 rounded-sm border border-border bg-bg/60 px-3 py-2">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-text2">
          O arquivo Excel não foi modificado. Revise o prompt antes de colar no Copilot.
        </p>
      </div>

      <label htmlFor="copilot-prompt" className="sr-only">
        Prompt final para o Copilot
      </label>
      <textarea
        id="copilot-prompt"
        ref={textareaRef}
        readOnly
        rows={16}
        value={prompt}
        spellCheck={false}
        className="mt-3 w-full resize-y rounded-sm border border-border bg-bg/50 px-3.5 py-3 font-mono text-[12px] leading-[1.65] text-text outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/10"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-brand-700 bg-brand-700 px-3.5 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:border-brand-800 hover:bg-brand-800"
        >
          <Clipboard size={13} strokeWidth={2} aria-hidden="true" />
          Copiar prompt
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3.5 text-[11.5px] font-semibold text-text shadow-sm transition-colors hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-700"
        >
          <Download size={13} strokeWidth={2} aria-hidden="true" />
          Baixar .txt
        </button>
        <button
          type="button"
          onClick={onBackToProject}
          className="ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-sm px-3 text-[11.5px] font-semibold text-text2 transition-colors hover:bg-bg hover:text-text"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          Voltar ao projeto
        </button>
      </div>
    </section>
  );
}
