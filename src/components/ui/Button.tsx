import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  tooltip?: string;
  external?: boolean;
  highlight?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-brand-700 bg-brand-700 text-white shadow-sm hover:border-brand-900 hover:bg-brand-900 disabled:hover:border-brand-700 disabled:hover:bg-brand-700",
  secondary:
    "border-2 border-brand-700 bg-surface text-brand-700 hover:bg-brand-100 disabled:hover:bg-surface",
  ghost:
    "border border-transparent bg-transparent text-text2 hover:bg-slate-100 hover:text-text disabled:hover:bg-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    icon: Icon,
    iconPosition = "left",
    tooltip,
    external = false,
    highlight = false,
    fullWidth = false,
    className,
    children,
    type = "button",
    disabled,
    ...rest
  },
  ref
) {
  const tooltipId = useId();
  const hasTooltip = Boolean(tooltip);

  const iconNode = Icon ? (
    <Icon size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
  ) : null;
  const externalNode = external ? (
    <ExternalLink size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
  ) : null;

  return (
    <span className={cn("group relative inline-flex", fullWidth && "w-full md:w-auto")}>
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-describedby={hasTooltip ? tooltipId : undefined}
        aria-label={hasTooltip ? `${typeof children === "string" ? children : "Ação"} — ${tooltip}` : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          VARIANTS[variant],
          disabled && "cursor-not-allowed opacity-50",
          highlight && "animate-pulse ring-2 ring-brand-500 ring-offset-2",
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {iconPosition === "left" ? iconNode : null}
        <span className="min-w-0 truncate">{children}</span>
        {iconPosition === "right" ? iconNode : null}
        {externalNode}
      </button>

      {hasTooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 w-max max-w-[250px] -translate-x-1/2 translate-y-1 rounded-sm border border-border bg-text px-2.5 py-1.5 text-center text-[10px] font-medium leading-snug text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        >
          {tooltip}
          <span
            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-text"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </span>
  );
});
