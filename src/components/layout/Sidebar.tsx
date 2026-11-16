import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FolderKanban, LayoutDashboard, RotateCcw, ShieldCheck, X } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { DEMO_CYCLE } from "@/data/demoSample";
import { formatDateBR } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/utils/cn";
import logoUnimed from "../../assets/logo-unimed.svg?inline";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, end: true },
  { to: "/projetos", label: "Projetos", icon: FolderKanban, end: false },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const projectCount = usePortfolioStore((state) => state.projects.length);
  const lastStatusUpload = usePortfolioStore((state) => state.lastStatusUpload);
  const resetDemo = usePortfolioStore((state) => state.resetDemo);
  const { pushToast } = useToast();
  const ciclo = lastStatusUpload?.ciclo ?? DEMO_CYCLE;
  const isDemo = lastStatusUpload === null;

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  async function handleResetDemo() {
    await resetDemo();
    pushToast({
      variant: "info",
      title: "Dados de demonstração restaurados",
      description: "O portal voltou para a amostra local com 4 projetos.",
    });
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-brand-900/55 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-brand-900 text-white transition-transform duration-250 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navegação principal"
      >
        <div className="relative overflow-hidden border-b border-white/[0.07] px-5 pb-5 pt-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/20 to-transparent"
            aria-hidden="true"
          />
          <svg
            className="pointer-events-none absolute -right-8 -top-6 h-40 w-40 text-white"
            viewBox="0 0 160 160"
            fill="none"
            aria-hidden="true"
            opacity="0.055"
          >
            <circle cx="80" cy="80" r="24" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="42" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="78" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-sm text-brand-100/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>

          <div className="relative">
            <div className="mb-5 flex justify-center">
              <img
                src={logoUnimed}
                alt="Unimed Campo Grande"
                className="h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
              />
            </div>
            <p className="text-center text-xs uppercase tracking-widest text-brand-100/60">
              Escritório de Projetos
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-100/40">
            Portfólio
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-10 items-center gap-3 rounded-sm px-3 text-[12.5px] font-medium transition-colors",
                      isActive
                        ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "text-brand-100/65 hover:bg-white/[0.06] hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "absolute left-0 h-5 w-[2.5px] rounded-r-full bg-brand-500 transition-opacity",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <Icon
                        size={16}
                        strokeWidth={isActive ? 2.1 : 1.8}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-brand-500" : "text-brand-100/50 group-hover:text-brand-100"
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.to === "/projetos" ? (
                        <span
                          className={cn(
                            "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-semibold tabular-nums",
                            isActive
                              ? "bg-brand-500/20 text-brand-100"
                              : "bg-white/[0.07] text-brand-100/55"
                          )}
                        >
                          {projectCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="mx-1 mt-7 rounded-md border border-white/[0.08] bg-white/[0.045] p-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-100/45">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isDemo ? "bg-status-warn" : "bg-brand-500"
                  )}
                  aria-hidden="true"
                />
                Ciclo atual
              </span>
              {isDemo ? (
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.08em] text-brand-100/55">
                  DEMO
                </span>
              ) : null}
            </div>
            <p className="mt-2 truncate font-display text-[12.5px] font-semibold text-white" title={ciclo}>
              {ciclo}
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-brand-100/45">
              {lastStatusUpload
                ? `Última carga em ${formatDateBR(lastStatusUpload.uploadedAt)}`
                : "Amostra local · 4 projetos"}
            </p>
            {lastStatusUpload ? (
              <p
                className="mt-1 truncate text-[9px] text-brand-100/35"
                title={lastStatusUpload.fileName}
              >
                {lastStatusUpload.fileName}
              </p>
            ) : null}
          </div>

          {!isDemo ? (
            <button
              type="button"
              onClick={() => void handleResetDemo()}
              className="mx-1 mt-2 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-sm px-2.5 py-2 text-[10px] font-medium text-brand-100/45 transition-colors hover:bg-white/[0.05] hover:text-brand-100"
            >
              <RotateCcw size={11} aria-hidden="true" />
              Restaurar dados de demonstração
            </button>
          ) : null}
        </div>

        <div className="border-t border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2 text-brand-100/45">
            <ShieldCheck size={12} strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[9px] font-medium uppercase tracking-[0.09em]">
              Leitura local e segura
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[8.5px] text-brand-100/30">
            <span>Portal PMO · v0.1</span>
            <span>Arquivos não são enviados</span>
          </div>
        </div>
      </aside>
    </>
  );
}
