import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface InfoChipProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoChip({ label, value, className }: InfoChipProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text2">{label}</p>
      <div className="mt-1 truncate text-[15px] font-semibold leading-snug text-text">{value}</div>
    </div>
  );
}
