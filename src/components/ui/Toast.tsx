import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

export type ToastVariant = "success" | "error" | "info";

export interface ToastData {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
  duration?: number;
}

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; border: string; bar: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "bg-status-ok/10 text-status-ok",
    border: "border-l-status-ok",
    bar: "bg-status-ok",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "bg-status-danger/10 text-status-danger",
    border: "border-l-status-danger",
    bar: "bg-status-danger",
  },
  info: {
    icon: Info,
    iconClass: "bg-brand-100 text-brand-700",
    border: "border-l-brand-500",
    bar: "bg-brand-500",
  },
};

export function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;
  const meta = VARIANT_META[toast.variant];
  const Icon = meta.icon;

  return (
    <div
      className="pointer-events-none fixed right-3 top-20 z-[120] w-[calc(100%-1.5rem)] max-w-[360px] sm:right-6 sm:w-[380px]"
      aria-live="polite"
    >
      <div
        role="status"
        className={cn(
          "pointer-events-auto relative flex animate-slide-in items-start gap-3 overflow-hidden rounded-md border border-l-4 border-border bg-surface p-3.5 shadow-lg",
          meta.border
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            meta.iconClass
          )}
          aria-hidden="true"
        >
          <Icon size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-snug text-text">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 break-words text-[11.5px] leading-relaxed text-text2">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-text2 transition-colors hover:bg-bg hover:text-text"
          aria-label="Fechar aviso"
        >
          <X size={13} aria-hidden="true" />
        </button>
        <span
          className={cn("absolute bottom-0 left-0 h-0.5 opacity-70", meta.bar)}
          style={{ animation: `toast-progress ${duration}ms linear forwards` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** Hook simples: mantém apenas o toast atual, com auto-dismiss de 4s. */
export function useToastState() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const dismiss = useCallback(() => setToast(null), []);
  const notify = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      setToast({ id: Date.now(), variant, title, description });
    },
    []
  );

  return { toast, notify, dismiss };
}
