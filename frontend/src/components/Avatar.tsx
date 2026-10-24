"use client";

import { useState } from "react";

type Size = "sm" | "md" | "lg" | "xl" | "ring";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
}

const sizeMap: Record<Size, { px: number; cls: string; text: string }> = {
  sm: { px: 28, cls: "h-7 w-7", text: "text-[11px]" },
  md: { px: 36, cls: "h-9 w-9", text: "text-xs" },
  lg: { px: 48, cls: "h-12 w-12", text: "text-sm" },
  xl: { px: 64, cls: "h-16 w-16", text: "text-base" },
  ring: { px: 96, cls: "h-24 w-24", text: "text-[40px]" },
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

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const dims = sizeMap[size];
  const label = initials(name);
  // Remember which URL failed, so a new photo for the same slot gets its own chance to load.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // A plain img: event photos come from any CDN (Luma, conference sites), which next/image would
  // reject unless every host were configured. A broken photo falls back to initials.
  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={dims.px}
        height={dims.px}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn(
          dims.cls,
          "rounded-full object-cover border border-line",
          className,
        )}
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
          className,
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
        className,
      )}
    >
      {label}
    </span>
  );
}
