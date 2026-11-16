import { create } from "zustand";
import { normalizeKey } from "@/lib/normalize";

export type AuthRole = "admin" | "pmo" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  role: AuthRole;
  pmoName?: string;
}

/**
 * Autenticação simulada — ponto único de troca para o Supabase Auth.
 * Quando o Supabase entrar, `login`/`logout` passam a chamar `supabase.auth`.
 */
const MOCK_USER: AuthUser = {
  id: "1",
  name: "Alexandre",
  role: "pmo",
  pmoName: "Alexandre",
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user?: Partial<AuthUser>) => void;
  logout: () => void;
  setRole: (role: AuthRole) => void;
}

const STORAGE_KEY = "pmo.auth.user";

/** Sessão mock persistida apenas para simular o Supabase Auth entre reloads. */
function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Sem chave = primeira visita (mock). "null" = logout explícito.
    if (raw === null) return MOCK_USER;
    if (raw === "null") return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed.role !== "admin" && parsed.role !== "pmo" && parsed.role !== "viewer") {
      return MOCK_USER;
    }
    return { ...MOCK_USER, ...parsed, id: parsed.id ?? MOCK_USER.id, name: parsed.name ?? MOCK_USER.name };
  } catch {
    return MOCK_USER;
  }
}

function persistUser(user: AuthUser | null): void {
  try {
    // Grava "null" (em vez de remover) para que o logout sobreviva ao reload.
    window.localStorage.setItem(STORAGE_KEY, user ? JSON.stringify(user) : "null");
  } catch {
    // Ambiente sem storage (SSR/privado): segue em memória.
  }
}

const initialUser = typeof window === "undefined" ? MOCK_USER : readStoredUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  isAuthenticated: initialUser !== null,
  login: (user = {}) => {
    const next = {
      ...MOCK_USER,
      ...user,
      id: user.id ?? MOCK_USER.id,
      name: user.name ?? MOCK_USER.name,
    };
    persistUser(next);
    set({ user: next, isAuthenticated: true });
  },
  logout: () => {
    persistUser(null);
    set({ user: null, isAuthenticated: false });
  },
  setRole: (role) => {
    const current = get().user ?? MOCK_USER;
    const next: AuthUser = {
      ...current,
      role,
      pmoName: role === "admin" || role === "viewer" ? undefined : current.pmoName ?? current.name,
    };
    persistUser(next);
    set({ user: next });
  },
}));

/** Admin edita tudo; PMO edita apenas os próprios projetos; viewer só lê. */
export function canEditProject(user: AuthUser | null, project: { pmo?: string | null }): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "viewer") return false;
  const userPmo = normalizeKey(user.pmoName ?? user.name);
  const projectPmo = normalizeKey(project.pmo ?? "");
  return Boolean(userPmo) && userPmo === projectPmo;
}

export function canManagePortfolio(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "pmo";
}

export function canManageUsers(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

export const ROLE_LABEL: Record<AuthRole, string> = {
  admin: "Administrador",
  pmo: "PMO",
  viewer: "Visualizador",
};
