import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Overlay acessível com portal, fechamento por Escape e clique no backdrop.
 * Mantém uma única instância no DOM e devolve o foco ao elemento de origem.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-brand-900/45 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full max-w-[620px] animate-fade-in flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
          className
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Portal PMO
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-[18px] font-semibold leading-tight tracking-[-0.025em] text-text"
            >
              {title}
            </h2>
            {subtitle ? (
              <p id={descriptionId} className="mt-1 text-[11.5px] leading-relaxed text-text2">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text2 transition-colors hover:bg-bg hover:text-text"
            aria-label="Fechar modal"
          >
            <X size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-bg/50 px-5 py-3 sm:px-6">
          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-surface px-4 text-[11.5px] font-semibold text-text transition-colors hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-700"
            >
              Fechar
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
