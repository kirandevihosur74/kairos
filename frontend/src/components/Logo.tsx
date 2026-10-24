import type { HTMLAttributes } from "react";

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Logo({ size = 28, className, style, ...rest }: LogoProps) {
  return (
    <span
      aria-label="Kairos"
      className={cn(
        "inline-flex items-center justify-center rounded-[7px] bg-ink text-white font-serif leading-none select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.6),
        ...style,
      }}
      {...rest}
    >
      k
    </span>
  );
}
