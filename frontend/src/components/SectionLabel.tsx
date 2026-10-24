import type { HTMLAttributes } from "react";

export type SectionLabelProps = HTMLAttributes<HTMLParagraphElement>;

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function SectionLabel({
  className,
  children,
  ...rest
}: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.04em] text-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}
