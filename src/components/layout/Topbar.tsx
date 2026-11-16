import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Menu, Search, Users, X } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { UploadButton } from "@/components/ui/UploadButton";
import { ROLE_LABEL, useAuthStore, type AuthRole } from "@/store/useAuthStore";

interface TopbarProps {
  onMenuClick: () => void;
}

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Visão Geral";
  if (pathname === "/projetos") return "Projetos";
  if (pathname.startsWith("/projetos/") && pathname.endsWith("/atualizar")) {
    return "Atualizar projeto";
  }
  if (pathname.startsWith("/projetos/")) return "Detalhes do projeto";
  return "Portal PMO";
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const busca = usePortfolioStore((state) => state.filters.busca);
  const setFilter = usePortfolioStore((state) => state.setFilter);
  const searchRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const setRole = useAuthStore((state) => state.setRole);

  useEffect(() => {
    if (!profileOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/projetos");
    searchRef.current?.blur();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-text2 transition-colors hover:bg-bg hover:text-text lg:hidden"
        aria-label="Abrir menu de navegação"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 shrink-0">
        <h1 className="truncate font-display text-[15px] font-semibold tracking-[-0.02em] text-text sm:text-[16px]">
          {pageTitle(location.pathname)}
        </h1>
        <p className="hidden text-[10px] font-medium text-text2 sm:block">
          Acompanhamento executivo do portfólio
        </p>
      </div>

      <form
        role="search"
        onSubmit={handleSubmit}
        className="group relative ml-auto hidden w-[240px] md:block xl:w-[320px]"
      >
        <Search
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text2 transition-colors group-focus-within:text-brand-700"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          value={busca}
          onChange={(event) => setFilter("busca", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFilter("busca", "");
          }}
          placeholder="Buscar projeto, ID ou líder..."
          aria-label="Busca global no portfólio"
          className="h-9 w-full rounded-sm border border-border bg-bg pl-8.5 pr-12 text-[12px] text-text outline-none transition-all placeholder:text-text2/70 focus:border-brand-500/50 focus:bg-surface focus:ring-2 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {busca ? (
          <button
            type="button"
            onClick={() => {
              setFilter("busca", "");
              searchRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-text2 transition-colors hover:bg-bg hover:text-text"
            aria-label="Limpar busca"
          >
            <X size={12} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[9px] font-semibold text-text2/70 transition-opacity group-focus-within:opacity-0">
            /
          </kbd>
        )}
      </form>

      <div className="ml-auto flex items-center gap-2.5 md:ml-0">
        <UploadButton label="Upload Status" />

        <span className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

        <div ref={profileRef} className="relative flex items-center gap-2.5">
          <div className="hidden text-right xl:block">
            <p className="text-[10.5px] font-semibold leading-tight text-text">
              {user?.name ?? "Visitante"}
            </p>
            <p className="text-[9.5px] leading-tight text-text2">
              {user ? ROLE_LABEL[user.role] : "Não autenticado"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Perfil e permissões do usuário"
            className="relative flex h-8 items-center gap-1 rounded-full border border-brand-100 bg-brand-100 px-2 text-[10px] font-semibold text-brand-900 ring-2 ring-brand-50 transition-colors hover:bg-brand-100/80"
          >
            {(user?.name ?? "PM").slice(0, 2).toUpperCase()}
            <ChevronDown size={11} aria-hidden="true" />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-status-ok"
              aria-hidden="true"
            />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              aria-label="Simular perfil de acesso"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-[236px] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Users size={12} className="text-brand-700" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text2">
                  Simular perfil (mock)
                </p>
              </div>
              {(Object.keys(ROLE_LABEL) as AuthRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setRole(role);
                    setProfileOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[11.5px] font-medium text-text transition-colors hover:bg-brand-50"
                >
                  {ROLE_LABEL[role]}
                  {user?.role === role ? (
                    <Check size={12} className="text-brand-700" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
