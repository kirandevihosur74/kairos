import Image from "next/image";

type Size = "sm" | "md" | "lg" | "xl" | "ring" | "company";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: Size;
  strongFit?: boolean;
  className?: string;
}

const sizeMap: Record<Size, { px: number; cls: string; text: string }> = {
  sm: { px: 28, cls: "h-7 w-7", text: "text-[11px]" },
  md: { px: 36, cls: "h-9 w-9", text: "text-xs" },
  lg: { px: 48, cls: "h-12 w-12", text: "text-sm" },
  xl: { px: 64, cls: "h-16 w-16", text: "text-base" },
  ring: { px: 96, cls: "h-24 w-24", text: "text-[40px]" },
  company: { px: 40, cls: "h-10 w-10", text: "text-xs" },
};

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Avatar({
  name,
  src,
  size = "md",
  strongFit,
  className,
}: AvatarProps) {
  const dims = sizeMap[size];
  const label = initials(name);

  if (size === "company") {
    return (
      <span
        aria-label={name}
        className={cn(
          dims.cls,
          dims.text,
          "inline-flex items-center justify-center rounded-[10px] bg-cream text-ink font-semibold select-none",
          className,
        )}
      >
        {label}
      </span>
    );
  }

  const inner = (() => {
    if (src) {
      return (
        <Image
          src={src}
          alt={name}
          width={dims.px}
          height={dims.px}
          className={cn(dims.cls, "rounded-full object-cover")}
        />
      );
    }
    if (size === "ring") {
      return (
        <span
          aria-label={name}
          className={cn(
            dims.cls,
            dims.text,
            "inline-flex items-center justify-center rounded-full bg-transparent text-ink border border-line font-serif leading-none select-none",
          )}
        >
          {label}
        </span>
      );
    }
    return (
      <span
        aria-label={name}
        className={cn(
          dims.cls,
          dims.text,
          "inline-flex items-center justify-center rounded-full bg-cream text-ink font-medium border border-line select-none",
        )}
      >
        {label}
      </span>
    );
  })();

  if (!strongFit) {
    return <span className={cn("inline-flex", className)}>{inner}</span>;
  }

  return (
    <span
      aria-label={name}
      className={cn(
        "relative inline-flex rounded-full bg-spectrum p-[2px]",
        className,
      )}
    >
      <span className="rounded-full bg-paper p-[2px] inline-flex">
        {inner}
      </span>
    </span>
  );
}
