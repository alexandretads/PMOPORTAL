import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/utils/cn";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  label?: string;
  align?: "left" | "right";
  className?: string;
  fullWidth?: boolean;
}

export function DropdownMenu({
  items,
  label = "Mais ações",
  align = "right",
  className,
  fullWidth = false,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => itemRefs.current[0]?.focus(), 0);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  function select(item: DropdownMenuItem) {
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const lastIndex = items.length - 1;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + direction + items.length) % items.length;
      itemRefs.current[nextIndex]?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      itemRefs.current[lastIndex]?.focus();
    }

    if (event.key === "Tab") setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-text2 transition-colors hover:bg-slate-100 hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          open && "bg-slate-100 text-text",
          fullWidth && "w-full md:w-auto"
        )}
      >
        <MoreHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
        <span className="hidden sm:inline">Mais</span>
        <span className="sr-only">Mais ações</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 min-w-[232px] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={index === 0 ? 0 : -1}
                onClick={() => select(item)}
                onKeyDown={(event) => handleMenuKeyDown(event, index)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium transition-colors",
                  "focus-visible:bg-brand-50 focus-visible:text-brand-900 focus-visible:outline-none",
                  item.danger
                    ? "text-status-danger hover:bg-status-danger/[0.06]"
                    : "text-text hover:bg-brand-50 hover:text-brand-900"
                )}
              >
                {Icon ? (
                  <Icon
                    size={13}
                    strokeWidth={1.9}
                    aria-hidden="true"
                    className="shrink-0 text-text2"
                  />
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
