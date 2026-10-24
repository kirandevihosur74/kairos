import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "article" | "section";
  padded?: boolean;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  as: Tag = "div",
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[12px] bg-card border border-line",
        padded && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
