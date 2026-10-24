import Image from "next/image";
import type { Reachability } from "@/lib/data/types";
import { REACHABILITY_META } from "@/lib/data/types";

export interface ReachabilityPillProps {
  value: Reachability;
  size?: "sm" | "md";
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function ReachabilityPill({
  value,
  size = "md",
}: ReachabilityPillProps) {
  const meta = REACHABILITY_META[value];
  const px = size === "sm" ? 14 : 16;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-card text-ink border border-line",
        size === "sm"
          ? "px-2 py-[5px] text-[11px]"
          : "px-3 py-[6px] text-[13px]",
      )}
    >
      <Image
        src={`/emoji/${meta.emoji}.svg`}
        alt=""
        width={px}
        height={px}
        aria-hidden
      />
      <span className="font-medium leading-none">{meta.label}</span>
    </span>
  );
}
