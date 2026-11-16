import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string | null;
  options: Array<string | FilterOption>;
  onChange: (value: string | null) => void;
  allLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "Todos",
  icon: Icon,
  className,
}: FilterSelectProps) {
  const id = useId();
  const normalizedOptions: FilterOption[] = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-text2"
      >
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            size={14}
            strokeWidth={1.9}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text2"
            aria-hidden="true"
          />
        ) : null}
        <select
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          className={cn(
            "h-9 w-full appearance-none rounded-sm border border-border bg-surface py-0 pr-8 text-[12px] font-medium text-text shadow-sm transition-colors hover:border-slate-300",
            Icon ? "pl-8" : "pl-3"
          )}
        >
          <option value="">{allLabel}</option>
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text2"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
