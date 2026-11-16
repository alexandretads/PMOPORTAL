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
