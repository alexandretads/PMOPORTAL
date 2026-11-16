import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  step?: string;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  ariaLabel = "Modo de atualização",
}: TabsProps<T>) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    refs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = items.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = index === lastIndex ? 0 : index + 1;
      onChange(items[nextIndex].value);
      focusTab(nextIndex);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = index === 0 ? lastIndex : index - 1;
      onChange(items[nextIndex].value);
      focusTab(nextIndex);
    }
    if (event.key === "Home") {
      event.preventDefault();
      onChange(items[0].value);
      focusTab(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      onChange(items[lastIndex].value);
      focusTab(lastIndex);
    }
  }

  return (
    <div className={cn("border-b border-border", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap items-center gap-1 sm:gap-2"
      >
        {items.map((item, index) => {
          const isActive = item.value === value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              ref={(element) => {
                refs.current[index] = element;
              }}
              id={`${baseId}-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "group relative -mb-px inline-flex min-w-0 items-center gap-2.5 rounded-t-sm border-b-2 px-2.5 py-3 text-left text-[11.5px] font-semibold transition-colors sm:px-3.5",
                isActive
                  ? "border-brand-500 text-brand-900"
                  : "border-transparent text-text2 hover:border-border hover:text-text"
              )}
            >
              {item.step ? (
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums transition-colors",
                    isActive
                      ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                      : "border-border bg-bg text-text2 group-hover:border-slate-300 group-hover:text-text"
                  )}
                  aria-hidden="true"
                >
                  {item.step}
                </span>
              ) : Icon ? (
                <Icon size={14} strokeWidth={2} aria-hidden="true" />
              ) : null}
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  className?: string;
}

export function TabPanel({ children, className }: TabPanelProps) {
  return <div className={cn("pt-4", className)}>{children}</div>;
}
