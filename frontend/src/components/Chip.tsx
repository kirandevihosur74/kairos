import type { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "outline" | "on" | "suggest" | "cream" | "alert" | "amber";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-subtle text-ink",
  outline: "bg-card text-ink border border-line",
  on: "bg-cream text-ink border border-ink",
  suggest:
    "bg-transparent text-muted border border-dashed border-line",
  cream: "bg-cream text-ink",
  alert: "bg-alert/10 text-alert",
  amber: "bg-amber/10 text-amber",
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Chip({
  tone = "outline",
  leading,
  trailing,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[13px] font-medium leading-none",
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
