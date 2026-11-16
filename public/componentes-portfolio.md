# Componentes isolados de gestão de portfólio

> Código-fonte completo dos 5 arquivos criados. Copie cada bloco para o caminho indicado.
> Gerado automaticamente para facilitar a migração. Nenhum vínculo com store, Supabase ou tipos globais.

## 1. `src/components/project/ProjectEditModal.tsx`

Caminho de destino: `src/components/project/ProjectEditModal.tsx`

```tsx
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Save, Trash2, X } from "lucide-react";

/**
 * Modal de edição de projeto — componente 100% controlado.
 * Não acessa store, Supabase ou banco de dados.
 * Os dados chegam por `project` e as alterações saem por `onSave`.
 */
export interface EditableProject {
  id?: string | number;
  nome?: string;
  sponsor?: string;
  lider?: string;
  pmo?: string;
  chamadoTopDesk?: string;
  chamado_topdesk?: string;
  tipo?: string;
  status?: string;
  fase?: string;
  [key: string]: any;
}

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: EditableProject | null;
  /** Recebe o projeto completo + campos do formulário. Pode ser async. */
  onSave: (data: EditableProject) => void | Promise<void>;
}

const TIPOS = ["Estratégico", "Tático", "Plano de Ação"] as const;

const STATUS_OPTIONS = [
  { value: "no_prazo", label: "No prazo" },
  { value: "em_atencao", label: "Em atenção" },
  { value: "atrasado", label: "Atrasado" },
  { value: "sem_apuracao", label: "Sem apuração" },
  { value: "parado", label: "Parado" },
  { value: "encerrado", label: "Encerrado" },
] as const;

const FASE_OPTIONS = [
  "Ideia",
  "Análise de Viabilidade",
  "Aprovação",
  "Planejamento",
  "Execução",
  "Encerramento",
] as const;

interface FormState {
  nome: string;
  sponsor: string;
  lider: string;
  pmo: string;
  chamadoTopDesk: string;
  tipo: string;
  status: string;
  fase: string;
}

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTipo(value: unknown): string {
  const key = fold(value);
  if (key.includes("tatic")) return "Tático";
  if (key.includes("plano") || key.includes("acao")) return "Plano de Ação";
  if (key.includes("estrateg")) return "Estratégico";
  return typeof value === "string" && value.trim() ? value.trim() : "Estratégico";
}

function normalizeStatus(value: unknown): string {
  const key = fold(value);
  if (key === "no_prazo" || key.includes("no prazo")) return "no_prazo";
  if (key === "em_atencao" || key.includes("atencao")) return "em_atencao";
  if (key.includes("atras")) return "atrasado";
  if (key.includes("parad") || key.includes("pausad")) return "parado";
  if (key.includes("encerr") || key.includes("conclu")) return "encerrado";
  return "sem_apuracao";
}

function normalizeFase(value: unknown): string {
  const key = fold(value);
  if (key.includes("ideia")) return "Ideia";
  if (key.includes("analise") || key.includes("viabilidade")) return "Análise de Viabilidade";
  if (key.includes("aprovacao")) return "Aprovação";
  if (key.includes("planejamento")) return "Planejamento";
  if (key.includes("execucao")) return "Execução";
  if (key.includes("encerramento")) return "Encerramento";
  return typeof value === "string" && value.trim() ? value.trim() : "Ideia";
}

function buildForm(project?: EditableProject | null): FormState {
  return {
    nome: String(project?.nome ?? ""),
    sponsor: String(project?.sponsor ?? ""),
    lider: String(project?.lider ?? ""),
    pmo: String(project?.pmo ?? ""),
    chamadoTopDesk: String(
      project?.chamadoTopDesk ?? project?.chamado_topdesk ?? project?.chamado ?? ""
    ),
    tipo: normalizeTipo(project?.tipo),
    status: normalizeStatus(project?.status),
    fase: normalizeFase(project?.fase),
  };
}

export function ProjectEditModal({
  isOpen,
  onClose,
  project,
  onSave,
}: ProjectEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [form, setForm] = useState<FormState>(() => buildForm(project));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildForm(project));
    setError(null);
    setConfirmCancel(false);
  }, [isOpen, project]);

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

  async function persist(data: EditableProject) {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(data);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar as alterações. Tente novamente."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.nome.trim()) {
      setError("Informe o nome do projeto.");
      nameRef.current?.focus();
      return;
    }
    await persist({
      ...(project ?? {}),
      nome: form.nome.trim(),
      sponsor: form.sponsor.trim(),
      lider: form.lider.trim(),
      pmo: form.pmo.trim(),
      chamadoTopDesk: form.chamadoTopDesk.trim(),
      tipo: form.tipo,
      status: form.status,
      fase: form.fase,
    });
  }

  async function handleConfirmCancel() {
    await persist({
      ...(project ?? {}),
      fase: "Cancelado",
    });
  }

  const fazes = FASE_OPTIONS.includes(form.fase as (typeof FASE_OPTIONS)[number])
    ? [...FASE_OPTIONS]
    : [...FASE_OPTIONS, form.fase];

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
      className="m-auto w-[min(680px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-lg border border-border bg-surface p-0 text-text shadow-lg outline-none backdrop:bg-brand-900/55 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Portfólio PMO
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] text-text"
            >
              Editar projeto
            </h2>
            <p className="mt-1 text-[11.5px] text-text2">
              ID {project?.id ?? "—"} · alterações serão enviadas para revisão
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text2 transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
            aria-label="Fechar modal de edição"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="edit-nome" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Nome do projeto <span className="text-status-danger">*</span>
              </label>
              <input
                id="edit-nome"
                ref={nameRef}
                type="text"
                aria-required="true"
                aria-invalid={Boolean(error)}
                maxLength={160}
                value={form.nome}
                onChange={(event) => update("nome", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none transition-colors focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
                placeholder="Nome do projeto"
              />
            </div>

            <div>
              <label htmlFor="edit-sponsor" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Sponsor
              </label>
              <input
                id="edit-sponsor"
                type="text"
                maxLength={120}
                value={form.sponsor}
                onChange={(event) => update("sponsor", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="edit-lider" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Líder
              </label>
              <input
                id="edit-lider"
                type="text"
                maxLength={120}
                value={form.lider}
                onChange={(event) => update("lider", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="edit-pmo" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                PMO
              </label>
              <input
                id="edit-pmo"
                type="text"
                maxLength={80}
                value={form.pmo}
                onChange={(event) => update("pmo", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="edit-chamado" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Chamado TopDesk
              </label>
              <input
                id="edit-chamado"
                type="text"
                maxLength={80}
                value={form.chamadoTopDesk}
                onChange={(event) => update("chamadoTopDesk", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
                placeholder="Ex.: TD-12345"
              />
            </div>

            <div>
              <label htmlFor="edit-tipo" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Tipo
              </label>
              <select
                id="edit-tipo"
                value={form.tipo}
                onChange={(event) => update("tipo", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              >
                {!TIPOS.includes(form.tipo as (typeof TIPOS)[number]) && form.tipo ? (
                  <option value={form.tipo}>{form.tipo}</option>
                ) : null}
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-status" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Status
              </label>
              <select
                id="edit-status"
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-fase" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                Fase
              </label>
              <select
                id="edit-fase"
                value={form.fase}
                onChange={(event) => update("fase", event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-[12.5px] text-text shadow-sm outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              >
                {fazes.map((fase) => (
                  <option key={fase} value={fase}>
                    {fase}
                  </option>
                ))}
              </select>
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

          {confirmCancel ? (
            <div
              role="alertdialog"
              aria-label="Confirmar cancelamento do projeto"
              className="mt-4 rounded-md border border-status-danger/25 bg-status-danger/[0.05] p-3.5"
            >
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-status-danger">
                <AlertTriangle size={14} aria-hidden="true" />
                Tem certeza que deseja cancelar este projeto?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text2">
                A fase será alterada para <strong className="font-semibold text-text">Cancelado</strong>.
                Essa ação será enviada ao responsável pelo portfólio.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirmCancel()}
                  disabled={isSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-status-danger bg-status-danger px-3 text-[11px] font-semibold text-white transition-colors hover:bg-status-danger/90 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Trash2 size={12} aria-hidden="true" />}
                  Confirmar cancelamento
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  disabled={isSaving}
                  className="inline-flex h-8 items-center rounded-sm border border-border bg-surface px-3 text-[11px] font-semibold text-text2 transition-colors hover:bg-bg hover:text-text disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg/40 px-5 py-3">
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={isSaving || !project?.id}
            title={!project?.id ? "Projeto precisa estar salvo para ser cancelado" : undefined}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-status-danger/30 bg-surface px-3 text-[11.5px] font-semibold text-status-danger transition-colors hover:border-status-danger/50 hover:bg-status-danger/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 size={13} aria-hidden="true" />
            Cancelar Projeto
          </button>

          <div className="flex items-center gap-2">
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
              {isSaving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

export default ProjectEditModal;
```

## 2. `src/components/project/CreateProjectModal.tsx`

Caminho de destino: `src/components/project/CreateProjectModal.tsx`

```tsx
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
```

## 3. `src/components/project/ProjectTimeline.tsx`

Caminho de destino: `src/components/project/ProjectTimeline.tsx`

```tsx
import { Check, Circle } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Stepper de fases do projeto — componente puramente visual.
 * - verde: fase registrada em `timeline`
 * - azul:  `currentFase`
 * - cinza: fases futuras
 */
export interface TimelineEntry {
  fase: string;
  data: string;
  [key: string]: any;
}

interface ProjectTimelineProps {
  timeline?: TimelineEntry[] | null;
  currentFase?: string | null;
  className?: string;
}

interface StepDefinition {
  key: string;
  label: string;
  aliases: string[];
}

const STEPS: StepDefinition[] = [
  { key: "ideia", label: "Ideia", aliases: ["ideia", "1ideia", "01ideia"] },
  {
    key: "analise",
    label: "Análise",
    aliases: ["analise", "analisedeviabilidade", "viabilidade", "2analise"],
  },
  {
    key: "aprovacao",
    label: "Aprovação",
    aliases: ["aprovacao", "3aprovacao"],
  },
  {
    key: "planejamento",
    label: "Planejamento",
    aliases: ["planejamento", "4planejamento"],
  },
  {
    key: "execucao",
    label: "Execução",
    aliases: ["execucao", "5execucao", "emexecucao"],
  },
  {
    key: "encerramento",
    label: "Encerramento",
    aliases: ["encerramento", "6encerramento", "encerrado", "concluido"],
  },
];

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function stepKey(value: unknown): string | null {
  const key = fold(value);
  if (!key) return null;
  return STEPS.find((step) => step.aliases.includes(key))?.key ?? null;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return value.trim();
}

export function ProjectTimeline({
  timeline,
  currentFase,
  className,
}: ProjectTimelineProps) {
  const entries = Array.isArray(timeline) ? timeline.filter(Boolean) : [];
  const currentKey = stepKey(currentFase);
  const currentIndex = currentKey ? STEPS.findIndex((step) => step.key === currentKey) : -1;

  const byKey = new Map<string, TimelineEntry>();
  for (const entry of entries) {
    const key = stepKey(entry?.fase);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, entry);
  }

  const currentOutsideFlow =
    typeof currentFase === "string" &&
    currentFase.trim().length > 0 &&
    currentKey === null;

  return (
    <section
      className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6", className)}
      aria-label="Linha do tempo de fases do projeto"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[14px] font-semibold tracking-[-0.02em] text-text">
            Linha do tempo
          </h3>
          <p className="mt-0.5 text-[10.5px] text-text2">
            Ideia → Encerramento · fases registradas e fase atual
          </p>
        </div>
        {currentFase ? (
          <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-sky-700">
            <Circle size={7} fill="currentColor" aria-hidden="true" />
            <span className="truncate">Atual: {currentFase}</span>
          </span>
        ) : null}
      </header>

      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-[720px] items-start gap-0">
          {STEPS.map((step, index) => {
            const entry = byKey.get(step.key);
            const isCurrent = currentKey === step.key;
            const isDone = !isCurrent && Boolean(entry);
            const isPast = currentIndex >= 0 && index < currentIndex;
            const connectorDone = index < STEPS.length - 1 && (isDone || isCurrent || isPast);
            const date = formatDate(entry?.data);

            return (
              <li
                key={step.key}
                className="flex min-w-0 flex-1 flex-col items-center px-1 text-center"
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-[2px] flex-1 rounded-full",
                      index === 0 ? "opacity-0" : connectorDone ? "bg-emerald-400" : "bg-slate-200"
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                      isCurrent
                        ? "border-sky-600 bg-sky-600 text-white shadow-[0_0_0_4px_rgba(2,132,199,0.14)]"
                        : isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                    )}
                    title={
                      isCurrent
                        ? `${step.label} (fase atual)`
                        : isDone
                          ? `${step.label} concluída${date ? ` em ${date}` : ""}`
                          : `${step.label} pendente`
                    }
                  >
                    {isDone ? (
                      <Check size={14} strokeWidth={1.9} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "h-[2px] flex-1 rounded-full",
                      index === STEPS.length - 1
                        ? "opacity-0"
                        : connectorDone
                          ? "bg-emerald-400"
                          : "bg-slate-200"
                    )}
                    aria-hidden="true"
                  />
                </div>

                <span
                  className={cn(
                    "mt-2 max-w-[104px] text-[10.5px] font-semibold leading-tight",
                    isCurrent ? "text-sky-700" : isDone ? "text-text" : "text-text2"
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 h-4 text-[9px] tabular-nums text-text2">
                  {date ?? ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {currentOutsideFlow ? (
        <p className="mt-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-text2">
          A fase atual informada é <strong className="font-semibold text-text">{currentFase}</strong>,
          que está fora do fluxo padrão (por exemplo, Parado ou Cancelado).
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-2 text-[10.5px] text-text2">
          Nenhuma fase com data registrada até o momento.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 text-[9.5px] text-text2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Registrada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-600" aria-hidden="true" />
          Fase atual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
          Futura
        </span>
      </div>
    </section>
  );
}

export default ProjectTimeline;
```

## 4. `src/components/project/ProjectHistory.tsx`

Caminho de destino: `src/components/project/ProjectHistory.tsx`

```tsx
import { useMemo } from "react";
import { History } from "lucide-react";
import { getWeekForDate } from "@/lib/calc/weekCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

/**
 * Feed de alterações agrupado por mês/semana.
 * Recebe `logs` por prop, sem acessar store ou banco.
 */
interface ProjectHistoryProps {
  logs?: any[];
  className?: string;
  title?: string;
  emptyMessage?: string;
}

interface NormalizedChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface NormalizedLog {
  id: string;
  timestamp: Date | null;
  iso: string;
  title: string;
  description: string;
  source: string;
  changes: NormalizedChange[];
  year: number;
  month: number;
  week: number;
}

interface HistoryGroup {
  key: string;
  label: string;
  sort: number;
  logs: NormalizedLog[];
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  sponsor: "Sponsor",
  lider: "Líder",
  pmo: "PMO",
  tipo: "Tipo",
  fase: "Fase",
  status: "Status",
  resumo_executivo: "Resumo executivo",
  resumoExecutivo: "Resumo executivo",
  impedimentos: "Impedimentos",
  previsao_go_live: "Previsão de go-live",
  previsaoGoLive: "Previsão de go-live",
  chamado_topdesk: "Chamado TopDesk",
  chamadoTopDesk: "Chamado TopDesk",
  avanco_real: "Avanço Real %",
  avancoReal: "Avanço Real %",
  avanco_previsto: "Avanço previsto",
  avancoPrevisto: "Avanço previsto",
  ultima_atualizacao_planner: "Última atualização do Planner",
  ultimaAtualizacaoPlanner: "Última atualização do Planner",
  data_ultima_reuniao: "Data da última reunião",
  dataUltimaReuniao: "Data da última reunião",
  data_proxima_reuniao: "Data da próxima reunião",
  dataProximaReuniao: "Data da próxima reunião",
  link_planner: "Link do Planner",
  linkPlanner: "Link do Planner",
  email_lider: "E-mail do Líder",
  emailLider: "E-mail do Líder",
  tarefas_priorizadas: "Tarefas priorizadas",
  tarefasPriorizadas: "Tarefas priorizadas",
};

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];

  // documentos.canvas.status → "Canvas — Status"
  const parts = field.split(".");
  if (parts[0] === "documentos" && parts.length >= 2) {
    const doc = parts[1];
    const prettyDoc = FIELD_LABELS[doc] ?? doc.charAt(0).toUpperCase() + doc.slice(1);
    const last = parts[parts.length - 1];
    const prettyProp =
      last === "dataSolicitacao"
        ? "solicitação"
        : last === "dataFinalizacao"
          ? "finalização"
          : last === "status"
            ? "status"
            : last;
    return `${prettyDoc} — ${prettyProp}`;
  }

  const spaced = field.replace(/[_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Datas puras são interpretadas ao meio-dia local (sem deslocamento de fuso). */
function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12);
  }
  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) {
    return new Date(Number(brDate[3]), Number(brDate[2]) - 1, Number(brDate[1]), 12);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readChanges(log: any): NormalizedChange[] {
  const changes: NormalizedChange[] = [];

  if (Array.isArray(log?.changes)) {
    for (const change of log.changes) {
      if (typeof change !== "object" || change === null) continue;
      const field = change.field ?? change.campo ?? change.key;
      if (typeof field !== "string" || !field.trim()) continue;
      changes.push({
        field,
        oldValue: change.old_value ?? change.oldValue ?? change.previous_value ?? change.de ?? null,
        newValue: change.new_value ?? change.newValue ?? change.current_value ?? change.para ?? null,
      });
    }
  }

  if (changes.length === 0 && typeof log?.field === "string") {
    changes.push({
      field: log.field,
      oldValue: log.old_value ?? log.oldValue ?? null,
      newValue: log.new_value ?? log.newValue ?? null,
    });
  }

  return changes;
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "boolean") return value ? "SIM" : "NÃO";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "vazio";
    const isPercent = /avanco|percent|%/i.test(field);
    if (isPercent && Math.abs(value) <= 1) {
      return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    }
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }

  if (Array.isArray(value)) {
    const list = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return list.length === 0 ? "vazio" : list.join(", ");
  }

  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return json.length > 120 ? `${json.slice(0, 117)}...` : json;
    } catch {
      return "objeto";
    }
  }

  const text = String(value).trim();
  if (!text) return "vazio";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

/** Exibe o horário no fuso de Campo Grande, independente do dispositivo. */
function formatDateTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Campo_Grande",
    })
      .format(date)
      .replace(",", " às");
  } catch {
    return date.toLocaleString("pt-BR");
  }
}

function normalizeLog(log: any, index: number): NormalizedLog | null {
  if (typeof log !== "object" || log === null) return null;

  const rawDate =
    log.changedAt ??
    log.changed_at ??
    log.updated_at ??
    log.created_at ??
    log.data ??
    log.date ??
    null;
  const timestamp = parseTimestamp(rawDate);
  const changes = readChanges(log);

  // Sem data e sem ano/mês/semana gravados não há como agrupar.
  const hasStoredWeek =
    Number.isFinite(Number(log.year)) &&
    Number.isFinite(Number(log.month)) &&
    Number.isFinite(Number(log.week));

  if (!timestamp && !hasStoredWeek) return null;

  const derived = timestamp ? getWeekForDate(timestamp) : null;
  const year = hasStoredWeek ? Number(log.year) : derived?.year ?? 0;
  const month = hasStoredWeek ? Number(log.month) : derived?.month ?? 0;
  const week = hasStoredWeek ? Number(log.week) : derived?.week ?? 0;

  if (month < 1 || month > 12 || week < 1) return null;

  const description =
    typeof log.description === "string"
      ? log.description
      : typeof log.descricao === "string"
        ? log.descricao
        : "";

  const source =
    typeof log.source === "string"
      ? log.source
      : typeof log.origem === "string"
        ? log.origem
        : typeof log.source_detail === "string"
          ? log.source_detail
          : "";

  return {
    id: String(log.id ?? `log-${index}`),
    timestamp,
    iso: timestamp ? timestamp.toISOString() : "",
    title:
      changes.length > 0
        ? `${changes.length} ${changes.length === 1 ? "campo alterado" : "campos alterados"}`
        : description || "Alteração registrada",
    description,
    source,
    changes,
    year,
    month,
    week,
  };
}

export function ProjectHistory({
  logs,
  className,
  title = "Histórico de alterações",
  emptyMessage = "Sem alterações registradas para este projeto.",
}: ProjectHistoryProps) {
  const groups = useMemo<HistoryGroup[]>(() => {
    const list = Array.isArray(logs) ? logs : [];
    const normalized = list
      .map((log, index) => normalizeLog(log, index))
      .filter((log): log is NormalizedLog => log !== null)
      .sort((a, b) => b.iso.localeCompare(a.iso));

    const map = new Map<string, HistoryGroup>();
    for (const log of normalized) {
      const key = `${log.year}-${log.month}-${log.week}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${MONTHS[log.month - 1]}/${log.year} - Semana ${log.week}`,
          sort: log.year * 10000 + log.month * 100 + log.week,
          logs: [],
        });
      }
      map.get(key)?.logs.push(log);
    }

    return Array.from(map.values())
      .sort((a, b) => b.sort - a.sort)
      .map((group) => ({
        ...group,
        logs: group.logs.sort((a, b) =>
          (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0)
        ),
      }));
  }, [logs]);

  const total = groups.reduce((sum, group) => sum + group.logs.length, 0);

  return (
    <section
      id="project-history"
      aria-labelledby="project-history-title"
      className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="project-history-title"
            className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.02em] text-text"
          >
            <History size={15} strokeWidth={1.9} className="text-brand-700" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-[11.5px] text-text2">
            Registros agrupados por mês e semana de acompanhamento.
          </p>
        </div>
        <span className="inline-flex h-7 items-center rounded-full border border-border bg-bg px-2.5 text-[10px] font-semibold tabular-nums text-text2">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </header>

      <div className="mt-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={History}
            title={emptyMessage}
            className="border-0 bg-bg/40 px-4 py-6 [&>h3]:mt-2.5 [&>h3]:text-[13px] [&>h3]:font-medium [&>h3]:text-text2 [&>span]:h-10 [&>span]:w-10 [&>span>svg]:h-[18px] [&>span>svg]:w-[18px]"
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <header className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-text2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                    {group.label}
                  </h3>
                  <span className="text-[9.5px] tabular-nums text-text2">
                    {group.logs.length} {group.logs.length === 1 ? "alteração" : "alterações"}
                  </span>
                </header>

                <ol className="space-y-2">
                  {group.logs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-md border border-border bg-bg/30 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[11.5px] font-semibold text-text">{log.title}</p>
                        <span className="shrink-0 text-[10px] tabular-nums text-text2">
                          {log.timestamp ? formatDateTime(log.timestamp) : "sem data"}
                        </span>
                      </div>

                      {log.changes.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {log.changes.map((change, index) => (
                            <li
                              key={`${log.id}-${change.field}-${index}`}
                              className="text-[11.5px] leading-relaxed text-text2"
                            >
                              O campo{" "}
                              <strong className="font-semibold text-text">
                                {fieldLabel(change.field)}
                              </strong>{" "}
                              foi alterado de{" "}
                              <span className="rounded bg-status-danger/[0.07] px-1 py-0.5 text-status-danger">
                                {formatValue(change.field, change.oldValue)}
                              </span>{" "}
                              para{" "}
                              <span className="rounded bg-status-ok/[0.08] px-1 py-0.5 font-medium text-status-ok">
                                {formatValue(change.field, change.newValue)}
                              </span>
                              .
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[11.5px] leading-relaxed text-text2">
                          {log.description || "Nenhum detalhe de campo disponível neste registro."}
                        </p>
                      )}

                      {log.source ? (
                        <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.08em] text-text2">
                          Origem: {log.source}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProjectHistory;
```

## 5. `src/lib/calc/exportTimeMachine.ts`

Caminho de destino: `src/lib/calc/exportTimeMachine.ts`

```tsx
import * as XLSX from "xlsx";
import { getWeekForDate, listWeeksForMonth } from "@/lib/calc/weekCalendar";
import { DOCUMENT_COLUMNS } from "@/lib/documentColumns";
import {
  STATUS_BACKUP_HEADERS,
  exportDate,
  exportPhase,
} from "@/lib/exporters/exportStatusExcel";

/**
 * Exportação Excel da máquina do tempo — função pura.
 *
 * Não acessa store, Supabase ou qualquer API. Recebe `projects` e `logs` por
 * parâmetro e dispara o download localmente.
 *
 * Algoritmo (rollback):
 * 1. calcula o fim da semana selecionada (sexta 23:59, fuso local);
 * 2. para cada projeto, ordena os logs do mais recente para o mais antigo;
 * 3. desfaz cada log posterior à data de corte, devolvendo `old_value`;
 * 4. o resultado é o estado cumulativo do projeto no fim daquela semana.
 *
 * Se não houver log na semana, o rollback naturalmente devolve o estado do
 * último log anterior (ou o estado atual, quando não há logs).
 *
 * Premissas para uma reconstrução fiel:
 * - `logs` é append-only e representa o portfólio inteiro;
 * - cada log traz `projectId`/`project_id` (ou a coleção tem um único projeto);
 * - cada alteração traz o valor anterior (`old_value`, `oldValue`, `previous`
 *   ou um objeto `before`). Logs somente com `new_value` não podem ser desfeitos
 *   e são ignorados no rollback;
 * - sem qualquer log, não é possível inferir o passado: exporta o estado atual.
 */

type AnyRecord = Record<string, any>;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Campos aceitos no rollback (camelCase e snake_case do Supabase). */
const FIELD_ALIASES: Record<string, string> = {
  ata: "ata",
  tipo: "tipo",
  tipo_de_projeto: "tipo",
  fase: "fase",
  fase_ordem: "faseOrdem",
  faseOrdem: "faseOrdem",
  nome: "nome",
  nome_do_projeto: "nome",
  sponsor: "sponsor",
  lider: "lider",
  pmo: "pmo",
  email_lider: "emailLider",
  emailLider: "emailLider",
  avanco_previsto: "avancoPrevisto",
  avancoPrevisto: "avancoPrevisto",
  avanco_real: "avancoReal",
  avancoReal: "avancoReal",
  status: "status",
  resumo_executivo: "resumoExecutivo",
  resumoExecutivo: "resumoExecutivo",
  impedimentos: "impedimentos",
  tarefas_priorizadas: "tarefasPriorizadas",
  tarefasPriorizadas: "tarefasPriorizadas",
  previsao_go_live: "previsaoGoLive",
  previsaoGoLive: "previsaoGoLive",
  previsao_de_go_live: "previsaoGoLive",
  chamado_topdesk: "chamadoTopDesk",
  chamado_top_desk: "chamadoTopDesk",
  chamadoTopDesk: "chamadoTopDesk",
  link_planner: "linkPlanner",
  linkPlanner: "linkPlanner",
  ultima_atualizacao_planner: "ultimaAtualizacaoPlanner",
  ultimaAtualizacaoPlanner: "ultimaAtualizacaoPlanner",
  data_ultima_reuniao: "dataUltimaReuniao",
  dataUltimaReuniao: "dataUltimaReuniao",
  data_proxima_reuniao: "dataProximaReuniao",
  dataProximaReuniao: "dataProximaReuniao",
  documentos: "documentos",
  documents: "documentos",
};

const FIELD_ALIASES_FOLDED: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([key, value]) => [fold(key), value])
);

const ROOT_ALIASES: Record<string, string> = {
  canvas: "canvas",
  eap: "eap",
  esg: "esg",
  rip: "rip",
  compliance: "compliance",
  parecer_compliance: "compliance",
  pessoas: "pessoas",
  viabilidade_pessoas: "pessoas",
  viabilidade_de_pessoas_e_cultura: "pessoas",
  ti: "ti",
  viabilidade_ti: "ti",
  engenharia: "engenharia",
  viabilidade_engenharia: "engenharia",
  financeira: "financeira",
  financeiro: "financeira",
  viabilidade_financeira: "financeira",
  parecer_consolidado: "parecerConsolidado",
  parecerconsolidado: "parecerConsolidado",
  tap: "tap",
  tep: "tep",
  kickoff: "kickoff",
  kick_off: "kickoff",
  planner: "planner",
};

const BINARY_LABELS: Record<string, string> = {
  SIM: "SIM",
  NAO: "NÃO",
  NA: "N/A",
  A_DEFINIR: "A DEFINIR",
};

const STATUS_LABELS: Record<string, string> = {
  no_prazo: "No prazo",
  em_atencao: "Em atenção",
  atrasado: "Atrasado",
  sem_apuracao: "Sem apuração",
  parado: "Parado",
  encerrado: "Encerrado",
};

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown, fallback = "A definir"): string {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function parseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function clone<T>(value: T): T {
  try {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);
  } catch {
    return value;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "2026-11-06" → sexta 23:59:59.999 no fuso local. */
function endOfDayLocal(iso: string): number {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function resolveWeekEnd(ano: number, mes: number, semana: number): string {
  const weeks = listWeeksForMonth(ano, mes);
  const match = weeks.find((week) => week.week === semana);
  if (match) return match.weekEnd;

  const middle = new Date(ano, mes - 1, Math.min(28, (semana - 1) * 7 + 3), 12);
  return getWeekForDate(middle).weekEnd;
}

function logProjectId(log: AnyRecord): string {
  return String(log.projectId ?? log.project_id ?? log.project?.id ?? log.project ?? "");
}

function logRawDate(log: AnyRecord): unknown {
  return (
    log.changedAt ??
    log.changed_at ??
    log.updated_at ??
    log.created_at ??
    log.data ??
    log.date ??
    log.weekEnd ??
    log.week_end ??
    null
  );
}

function logTimestamp(log: AnyRecord, fallbackWeekEnd?: string): number {
  const raw = logRawDate(log);
  if (typeof raw === "string") {
    const value = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const local = new Date(
        Number(value.slice(0, 4)),
        Number(value.slice(5, 7)) - 1,
        Number(value.slice(8, 10)),
        12
      );
      if (!Number.isNaN(local.getTime())) return local.getTime();
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.getTime();

  const year = Number(log.year);
  const month = Number(log.month);
  const week = Number(log.week);
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(week) && month >= 1 && month <= 12) {
    const weekEnd = log.weekEnd ?? log.week_end ?? resolveWeekEnd(year, month, week);
    const parsed = endOfDayLocal(String(weekEnd));
    if (parsed > 0) return parsed;
  }

  return fallbackWeekEnd ? endOfDayLocal(fallbackWeekEnd) : 0;
}

function readChanges(log: AnyRecord): Array<{ field: string; oldValue: unknown }> {
  const result: Array<{ field: string; oldValue: unknown }> = [];
  const hasOld = (source: AnyRecord) =>
    "old_value" in source ||
    "oldValue" in source ||
    "previous_value" in source ||
    "previous" in source ||
    "de" in source;
  const oldOf = (source: AnyRecord) =>
    parseValue(source.old_value ?? source.oldValue ?? source.previous_value ?? source.previous ?? source.de ?? null);

  if (Array.isArray(log.changes)) {
    for (const change of log.changes) {
      if (typeof change !== "object" || change === null) continue;
      const field = change.field ?? change.campo;
      if (typeof field !== "string" || !field.trim()) continue;
      if (!hasOld(change)) continue;
      result.push({ field, oldValue: oldOf(change) });
    }
  }

  if (result.length === 0 && typeof log.field === "string" && hasOld(log)) {
    result.push({ field: log.field, oldValue: oldOf(log) });
  }

  // Estrutura alternativa frequente em bancos: snapshot "before" da linha.
  if (result.length === 0 && typeof log.before === "object" && log.before !== null) {
    for (const [field, value] of Object.entries(log.before)) {
      result.push({ field, oldValue: value });
    }
  }

  return result;
}

const ROOT_ALIASES_FOLDED: Record<string, string> = Object.fromEntries(
  Object.entries(ROOT_ALIASES).map(([key, value]) => [fold(key), value])
);

function normalizeFieldPath(field: string): string[] | null {
  const parts = field.split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((part) => FORBIDDEN_KEYS.has(part))) return null;

  const rootKey = parts[0];
  const camelRoot =
    FIELD_ALIASES[rootKey] ?? FIELD_ALIASES_FOLDED[fold(rootKey)] ?? rootKey;

  const knownRoots = new Set([...Object.values(FIELD_ALIASES), "documentos"]);
  if (!knownRoots.has(camelRoot)) return null;

  if (camelRoot !== "documentos") {
    return parts.length === 1 ? [camelRoot] : null;
  }

  if (parts.length < 2) return null;
  const docKey =
    ROOT_ALIASES[parts[1]] ?? ROOT_ALIASES_FOLDED[fold(parts[1])] ?? parts[1];
  if (FORBIDDEN_KEYS.has(docKey)) return null;
  if (parts.length === 2) return ["documentos", docKey];
  if (parts.length === 3 && ["status", "dataSolicitacao", "dataFinalizacao"].includes(parts[2])) {
    return ["documentos", docKey, parts[2]];
  }
  return null;
}

function applyValue(target: AnyRecord, field: string, value: unknown): void {
  const path = normalizeFieldPath(field);
  if (!path) return;

  let cursor: AnyRecord = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const current = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined;
    if (typeof current !== "object" || current === null) cursor[key] = {};
    cursor = cursor[key] as AnyRecord;
    if (typeof cursor !== "object" || cursor === null) return;
  }

  cursor[path[path.length - 1]] = parseValue(value);
}

function projectDocumentos(project: AnyRecord): AnyRecord {
  const docs = project.documentos ?? project.documents;
  return typeof docs === "object" && docs !== null ? docs : {};
}

function readDocument(project: AnyRecord, key: string): AnyRecord {
  const docs = projectDocumentos(project);
  if (docs[key] && typeof docs[key] === "object") return docs[key] as AnyRecord;

  const target = fold(key);
  for (const [docKey, value] of Object.entries(docs)) {
    if (fold(ROOT_ALIASES[fold(docKey)] ?? docKey) === target && typeof value === "object" && value !== null) {
      return value as AnyRecord;
    }
  }
  return { status: "A_DEFINIR", dataSolicitacao: null, dataFinalizacao: null };
}

function binaryLabel(value: unknown): string {
  const key = fold(value).toUpperCase();
  if (key === "SIM" || key === "S" || key === "TRUE") return BINARY_LABELS.SIM;
  if (key === "NAO" || key === "N" || key === "FALSE" || key === "NÃO") return BINARY_LABELS.NAO;
  if (key === "NA" || key === "NAO_SE_APLICA" || key === "NAOSEAPLICA") return BINARY_LABELS.NA;
  return BINARY_LABELS.A_DEFINIR;
}

function statusLabel(value: unknown): string {
  const key = String(value ?? "").trim();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  const match = Object.entries(STATUS_LABELS).find(([, label]) => fold(label) === fold(key));
  if (match) return match[1];
  return key ? text(key) : "A definir";
}

function buildProjectRow(project: AnyRecord): Array<string | number> {
  const tasks = Array.isArray(project.tarefasPriorizadas ?? project.tarefas_priorizadas)
    ? (project.tarefasPriorizadas ?? project.tarefas_priorizadas).slice(0, 5)
    : [];

  const percent = (value: unknown): number | "" => {
    if (value === null || value === undefined || value === "") return "";
    const numeric = Number(String(value).replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(numeric)) return "";
    const normalized = numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
    return Math.round(normalized * 1000) / 1000;
  };

  const values: Record<string, string | number> = {
    "ID do Projeto": text(project.id, ""),
    ATA: text(project.ata),
    "Tipo de Projeto": text(project.tipo ?? project.tipo_projeto),
    Fase: exportPhase(project.fase ?? project.phase),
    Projeto: text(project.nome ?? project.name),
    Sponsor: text(project.sponsor),
    Líder: text(project.lider ?? project.leader),
    PMO: text(project.pmo),
    "Avanço previsto": percent(project.avancoPrevisto ?? project.avanco_previsto),
    "Avanço Real %": percent(project.avancoReal ?? project.avanco_real),
    Status: statusLabel(project.status),
    "Resumo executivo": text(project.resumoExecutivo ?? project.resumo_executivo),
    Impedimentos: text(project.impedimentos),
    "Tarefa Priorizada 1": text(tasks[0]),
    "Tarefa Priorizada 2": text(tasks[1]),
    "Tarefa Priorizada 3": text(tasks[2]),
    "Tarefa Priorizada 4": text(tasks[3]),
    "Tarefa Priorizada 5": text(tasks[4]),
    "Previsão de go-live": exportDate(project.previsaoGoLive ?? project.previsao_go_live),
    "Chamado TopDesk": text(project.chamadoTopDesk ?? project.chamado_topdesk),
    "Material de Apoio": text(project.materialApoio ?? project.material_apoio),
    "Link do Planner": text(project.linkPlanner ?? project.link_planner),
    "Periodicidade da reunião": text(project.periodicidadeReuniao ?? project.periodicidade_reuniao),
    "Data da última reunião": exportDate(project.dataUltimaReuniao ?? project.data_ultima_reuniao),
    "Data da próxima reunião": exportDate(project.dataProximaReuniao ?? project.data_proxima_reuniao),
    "Data da última atualização do Planner": exportDate(
      project.ultimaAtualizacaoPlanner ?? project.ultima_atualizacao_planner
    ),
    x: "",
    "E-mail do Líder": text(project.emailLider ?? project.email_lider),
  };

  for (const columns of DOCUMENT_COLUMNS) {
    const document = readDocument(project, columns.key);
    const status = binaryLabel(document.status);
    values[columns.status[0]] = status;

    if (columns.key === "parecerConsolidado") continue;
    values[columns.dataSolicitacao[0]] = exportDate(document.dataSolicitacao);
    values[columns.dataFinalizacao[0]] = exportDate(document.dataFinalizacao);
  }

  return ["", ...STATUS_BACKUP_HEADERS.map((header) => values[header] ?? "")];
}

/**
 * Gera o Excel do estado do portfólio no fim de uma semana específica.
 *
 * @param projects lista de projetos (formato do site ou do Supabase)
 * @param logs     histórico append-only com alterações (changes/old_value)
 * @param ano      ano do mês da semana (ex.: 2026)
 * @param mes      mês 1-12 da semana (semana pertence ao mês da quarta-feira)
 * @param semana   número da semana dentro do mês (1-based)
 */
export function gerarExcelDaSemana(
  projects: any[],
  logs: any[],
  ano: number,
  mes: number,
  semana: number
): void {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(semana)) {
    throw new Error("Ano, mês e semana devem ser números inteiros.");
  }
  if (mes < 1 || mes > 12) throw new Error("Mês inválido. Informe um valor entre 1 e 12.");
  if (semana < 1 || semana > 6) throw new Error("Semana inválida. Informe um valor entre 1 e 6.");

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  const weekEnd = resolveWeekEnd(ano, mes, semana);
  const targetMs = endOfDayLocal(weekEnd);

  const snapshots = safeProjects.map((rawProject) => {
    if (typeof rawProject !== "object" || rawProject === null) return null;
    const project = clone(rawProject) as AnyRecord;

    const projectId = String(project.id ?? "");
    // Logs sem projectId são ambíguos: só podem ser aplicados quando a coleção
    // tem exatamente um projeto. Caso contrário, ignora para não contaminar.
    const allowAnonymous = safeProjects.length === 1;
    const projectLogs = safeLogs.filter((log) => {
      if (typeof log !== "object" || log === null) return false;
      const logId = logProjectId(log);
      if (logId === "") return allowAnonymous;
      return logId === projectId;
    });

    // Compatibilidade: projetos com histórico embutido (sem coleção externa).
    const embedded = Array.isArray(project.historico) ? (project.historico as any[]) : [];
    const source = projectLogs.length > 0 ? projectLogs : embedded;

    const future = source
      .filter((log): log is AnyRecord => typeof log === "object" && log !== null)
      .map((log) => ({ log, timestamp: logTimestamp(log, weekEnd) }))
      .filter((entry) => entry.timestamp > targetMs)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const { log } of future) {
      for (const change of readChanges(log)) {
        applyValue(project, change.field, change.oldValue);
      }
    }

    return project;
  }).filter((project): project is AnyRecord => project !== null);

  const [weekYear, weekMonth, weekDay] = weekEnd.split("-");
  const weekEndBr = `${weekDay}/${weekMonth}/${weekYear}`;

  const workbook = XLSX.utils.book_new();
  const rows: Array<Array<string | number>> = [
    [`Status Report - Snapshot Semanal ${weekEndBr} (${pad(mes)}/${ano} · Semana ${semana})`],
    [],
    ["", ...STATUS_BACKUP_HEADERS],
    ...snapshots.map(buildProjectRow),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 4 },
    ...STATUS_BACKUP_HEADERS.map((header) => ({
      wch: Math.min(42, Math.max(12, header.length + 2)),
    })),
  ];
  worksheet["!freeze"] = {
    xSplit: 1,
    ySplit: 3,
    topLeftCell: "B4",
    activePane: "bottomRight",
    state: "frozen",
  };
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 2, c: 1 },
      e: { r: Math.max(2, rows.length - 1), c: STATUS_BACKUP_HEADERS.length },
    }),
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, "NovS1");

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Backup_Status_${ano}-${pad(mes)}_S${semana}.xlsx`;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default gerarExcelDaSemana;
```

