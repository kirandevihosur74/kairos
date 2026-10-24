import type { HTMLAttributes } from "react";

type Radius = "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "article" | "section";
  padded?: boolean;
  radius?: Radius;
}

const radiusClasses: Record<Radius, string> = {
  md: "rounded-[12px]",
  lg: "rounded-[16px]",
};

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  as: Tag = "div",
  padded = true,
  radius = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-card border border-line",
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
