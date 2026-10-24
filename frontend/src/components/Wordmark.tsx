import type { HTMLAttributes } from "react";

export interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Wordmark({
  size = "md",
  className,
  ...rest
}: WordmarkProps) {
  return (
    <span
      aria-label="Kairos"
      className={cn(
        "font-serif text-ink leading-none select-none",
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      kairos
    </span>
  );
}
