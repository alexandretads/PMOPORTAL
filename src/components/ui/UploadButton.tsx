import { useRef, useState, type ChangeEvent } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { canManagePortfolio, useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/utils/cn";

interface UploadButtonProps {
  label?: string;
  variant?: "solid" | "outline" | "light";
  size?: "sm" | "md";
  className?: string;
  onSuccess?: (count: number) => void;
}

const VARIANTS = {
  solid:
    "border-brand-700 bg-brand-700 text-white shadow-sm hover:bg-brand-800 hover:border-brand-800 disabled:bg-brand-700/60",
  outline:
    "border-border bg-surface text-text shadow-sm hover:border-brand-500/40 hover:bg-brand-50 disabled:opacity-60",
  light:
    "border-brand-900/10 bg-white text-brand-900 shadow-sm hover:bg-brand-50 disabled:opacity-70",
};

export function UploadButton({
  label = "Upload Status",
  variant = "solid",
  size = "md",
  className,
  onSuccess,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const isLoading = usePortfolioStore((state) => state.isLoading) || isLocalLoading;
  const importStatusFile = usePortfolioStore((state) => state.importStatusFile);
  const user = useAuthStore((state) => state.user);
  const canImport = canManagePortfolio(user);
  const { pushToast } = useToast();

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!canImport) {
      pushToast({
        variant: "error",
        title: "Sem permissão para importar",
        description: "Seu perfil é somente leitura. Solicite acesso ao administrador.",
      });
      input.value = "";
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      pushToast({
        variant: "error",
        title: "Formato não suportado",
        description: "Selecione um arquivo Excel (.xlsx ou .xls).",
      });
      input.value = "";
      return;
    }

    setIsLocalLoading(true);
    try {
      const result = await importStatusFile(file);
      if (!result.ok) {
        pushToast({
          variant: "error",
          title: "Falha ao importar a planilha",
          description: result.error ?? "Não foi possível ler o arquivo.",
        });
        return;
      }
      pushToast({
        variant: "success",
        title: "Portfólio atualizado",
        description: `${result.count} ${
          result.count === 1 ? "projeto carregado" : "projetos carregados"
        } · ${result.ciclo ?? "Ciclo atual"}`,
      });
      onSuccess?.(result.count);
    } finally {
      setIsLocalLoading(false);
      input.value = "";
      input.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        onChange={handleFile}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading || !canImport}
        aria-busy={isLoading}
        title={!canImport ? "Perfil somente leitura" : undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border font-semibold transition-all duration-150 disabled:cursor-wait",
          size === "md" ? "h-9 px-3.5 text-[12px]" : "h-8 px-3 text-[11px]",
          VARIANTS[variant],
          className
        )}
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <FileSpreadsheet size={15} strokeWidth={2} aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isLoading ? "Lendo planilha..." : label}</span>
        <span className="sm:hidden">{isLoading ? "Lendo..." : "Upload"}</span>
      </button>
    </>
  );
}
