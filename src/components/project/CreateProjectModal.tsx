import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, FolderPlus, Loader2, X } from "lucide-react";

/**
 * Modal de criação de projeto — puro e controlado.
 * Não acessa store, Supabase ou banco. `onSave` recebe apenas os campos do
 * formulário; o consumidor define defaults (fase/status) e persiste.
 */
export interface NewProjectInput {
  nome: string;
  tipo: string;
  sponsor: string;
  lider: string;
  pmo: string;
  [key: string]: any;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewProjectInput) => void | Promise<void>;
}

const TIPOS = ["Estratégico", "Tático", "Plano de Ação"] as const;

interface FormState {
  nome: string;
  tipo: string;
  sponsor: string;
  lider: string;
  pmo: string;
}

const INITIAL_FORM: FormState = {
  nome: "",
  tipo: "Estratégico",
  sponsor: "",
  lider: "",
  pmo: "",
};

export function CreateProjectModal({ isOpen, onClose, onSave }: CreateProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const tipoListId = useId();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      window.setTimeout(() => nameRef.current?.focus(), 30);
    }
    if (!isOpen && dialog.open) dialog.close();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.nome.trim()) {
      setError("Informe o nome do projeto.");
      nameRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        nome: form.nome.trim(),
        tipo: form.tipo.trim() || "Estratégico",
        sponsor: form.sponsor.trim(),
        lider: form.lider.trim(),
        pmo: form.pmo.trim(),
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar o projeto. Tente novamente."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
      className="m-auto w-[min(560px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-lg border border-border bg-surface p-0 text-text shadow-lg outline-none backdrop:bg-brand-900/55 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Portfólio PMO
            </p>
            <h2
              id={titleId}
              className="mt-1 flex items-center gap-2 font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] text-text"
            >
              <FolderPlus size={17} className="text-brand-700" aria-hidden="true" />
              Novo projeto
            </h2>
            <p className="mt-1 text-[11.5px] text-text2">
              O projeto entra como rascunho e pode ser completado depois.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text2 transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
            aria-label="Fechar modal de criação"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="create-nome" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Nome do projeto <span className="text-status-danger">*</span>
              </label>
              <input
                id="create-nome"
                ref={nameRef}
                type="text"
                aria-required="true"
                aria-invalid={Boolean(error)}
                maxLength={160}
                value={form.nome}
                onChange={(event) => update("nome", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none transition-colors placeholder:text-text2/60 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
                placeholder="Ex.: Novo modelo de Atenção Primária"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="create-tipo" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Tipo
              </label>
              <input
                id="create-tipo"
                type="text"
                list={tipoListId}
                maxLength={60}
                value={form.tipo}
                onChange={(event) => update("tipo", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
                placeholder="Estratégico, Tático ou Plano de Ação"
              />
              <datalist id={tipoListId}>
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="create-sponsor" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Sponsor
              </label>
              <input
                id="create-sponsor"
                type="text"
                maxLength={120}
                value={form.sponsor}
                onChange={(event) => update("sponsor", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="create-lider" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Líder
              </label>
              <input
                id="create-lider"
                type="text"
                maxLength={120}
                value={form.lider}
                onChange={(event) => update("lider", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="create-pmo" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                PMO
              </label>
              <input
                id="create-pmo"
                type="text"
                maxLength={80}
                value={form.pmo}
                onChange={(event) => update("pmo", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-sm border border-status-danger/20 bg-status-danger/[0.06] px-3 py-2.5"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-danger" aria-hidden="true" />
              <p className="text-[11.5px] leading-relaxed text-status-danger">{error}</p>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-bg/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-9 items-center rounded-sm border border-border bg-surface px-3.5 text-[11.5px] font-semibold text-text2 transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-brand-700 bg-brand-700 px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:border-brand-800 hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <FolderPlus size={13} aria-hidden="true" />}
            {isSaving ? "Criando..." : "Criar"}
          </button>
        </footer>
      </form>
    </dialog>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

export default CreateProjectModal;
