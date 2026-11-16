import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, Database } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { UploadButton } from "@/components/ui/UploadButton";
import { usePortfolioStore } from "@/store/usePortfolioStore";

function DemoBanner() {
  return (
    <div className="sticky top-16 z-20 border-b border-status-warn/20 bg-status-warn/[0.07]">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 px-4 py-2.5 sm:px-6 lg:px-8">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-warn/15 text-status-warn"
          aria-hidden="true"
        >
          <AlertTriangle size={12.5} strokeWidth={2.2} />
        </span>
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-text sm:text-[11.5px]">
          <strong className="font-semibold">Dados de demonstração.</strong>{" "}
          <span className="hidden text-text2 sm:inline">
            Faça upload da planilha para carregar o portfólio real.
          </span>
          <span className="text-text2 sm:hidden">Envie sua planilha para carregar o real.</span>
        </p>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-status-warn/25 bg-surface/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-status-warn lg:inline-flex">
          <Database size={10} aria-hidden="true" />4 projetos DEMO
        </span>
        <UploadButton
          label="Carregar planilha"
          variant="outline"
          size="sm"
          className="ml-0 border-status-warn/30 bg-surface/80 px-2.5 text-status-warn hover:border-status-warn/50 hover:bg-surface sm:ml-1 sm:px-3"
        />
      </div>
    </div>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isDemo = usePortfolioStore((state) => state.lastStatusUpload === null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-sm focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
        >
          Pular para o conteúdo
        </a>

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-h-screen lg:pl-[240px]">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          {isDemo ? <DemoBanner /> : null}

          <main id="main-content" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
              <Outlet />
            </div>
          </main>

          <footer className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 pb-6 pt-1 text-[10px] text-text2 sm:px-6 lg:px-8">
            <p>
              <span className="font-medium text-text">Portal PMO</span> · Unimed Campo Grande
            </p>
            <p>Leitura de Excel processada localmente no navegador</p>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
