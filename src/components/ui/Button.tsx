import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald";
  size?: "xs" | "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const variantStyles = {
      primary:
        "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs active:scale-[0.98]",
      emerald:
        "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-xs active:scale-[0.98]",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
      outline:
        "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 shadow-xs",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 shadow-xs active:scale-[0.98]",
    };

    const sizeStyles = {
      xs: "px-2.5 py-1 text-[11px] rounded-lg font-medium",
      sm: "px-3 py-1.5 text-xs rounded-xl font-semibold",
      md: "px-4 py-2 text-xs sm:text-sm rounded-xl font-semibold",
      lg: "px-5 py-2.5 text-sm sm:text-base rounded-2xl font-bold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 transition-all select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

