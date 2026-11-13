import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
}

export function Avatar({
  src,
  alt = "Avatar",
  fallback,
  size = "md",
  isOnline = false,
  className,
  ...props
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const sizeStyles = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-xs sm:text-sm",
    lg: "h-11 w-11 text-base",
  };

  return (
    <div className={cn("relative inline-block select-none", className)} {...props}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-bold bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs border border-white dark:border-slate-800",
          sizeStyles[size]
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{fallback.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
      )}
    </div>
  );
}

