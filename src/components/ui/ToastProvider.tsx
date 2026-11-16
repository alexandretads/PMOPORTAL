import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; border: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "bg-status-ok/10 text-status-ok",
    border: "border-l-status-ok",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "bg-status-danger/10 text-status-danger",
    border: "border-l-status-danger",
  },
  info: {
    icon: Info,
    iconClass: "bg-brand-100 text-brand-700",
    border: "border-l-brand-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = "info" }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current.slice(-2), { id, title, description, variant }]);
      const timer = window.setTimeout(() => removeToast(id), 5600);
      timers.current.push(timer);
    },
    [removeToast]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-20 z-[90] flex w-[calc(100%-2rem)] max-w-[380px] flex-col gap-2 sm:right-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant];
          const Icon = styles.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex animate-slide-in items-start gap-3 rounded-md border border-l-4 border-border bg-surface p-3.5 shadow-lg",
                styles.border
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  styles.iconClass
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
                onClick={() => removeToast(toast.id)}
                className="rounded p-1 text-text2 transition-colors hover:bg-bg hover:text-text"
                aria-label="Fechar notificação"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return context;
}
