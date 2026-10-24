import type { HTMLAttributes } from "react";

type Radius = "md" | "lg" | "xl";
type Tone = "plain" | "attention" | "suggest" | "subtle";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "article" | "section";
  padded?: boolean;
  radius?: Radius;
  tone?: Tone;
}

const radiusClasses: Record<Radius, string> = {
  md: "rounded-[12px]",
  lg: "rounded-[16px]",
  xl: "rounded-[20px]",
};

const toneClasses: Record<Tone, string> = {
  plain: "bg-card border border-line",
  subtle: "bg-subtle",
  attention: "bg-cream border-2 border-[#F7D84A]",
  suggest: "bg-card border border-dashed border-line",
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  as: Tag = "div",
  padded = true,
  radius = "md",
  tone = "plain",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        toneClasses[tone],
        radiusClasses[radius],
        padded && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
