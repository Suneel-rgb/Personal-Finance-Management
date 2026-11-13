import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "info" | "neutral" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    info: "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    outline: "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-transparent",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold rounded-md",
    md: "px-2.5 py-1 text-xs font-semibold rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

