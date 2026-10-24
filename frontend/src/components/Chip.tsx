import type { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "cream" | "outline" | "alert" | "amber";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-subtle text-ink",
  cream: "bg-cream text-ink",
  outline: "bg-transparent text-ink border border-line",
  alert: "bg-alert/10 text-alert",
  amber: "bg-amber/10 text-amber",
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Chip({
  tone = "neutral",
  leading,
  trailing,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium leading-none",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </span>
  );
}
