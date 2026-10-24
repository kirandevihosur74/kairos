"use client";

import { DesignIcon, type IconName } from "./DesignIcon";

export type NavKey = "today" | "discover" | "mic" | "sheet" | "drafts";
export interface BottomNavProps { active?: NavKey; onSelect?: (key: NavKey) => void }
const items: { key: NavKey; label: string; icon: IconName }[] = [
  { key: "today", label: "Today", icon: "home" },
  { key: "discover", label: "Discover", icon: "compass" },
  { key: "mic", label: "Capture voice note", icon: "mic" },
  { key: "sheet", label: "Sheet", icon: "sheet" },
  { key: "drafts", label: "Drafts", icon: "mail" },
];

export function BottomNav({ active = "today", onSelect }: BottomNavProps) {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[390px] items-start justify-between border-t border-line bg-card px-4 pt-2 pb-[max(26px,env(safe-area-inset-bottom))]">
      {items.map((item) => (
        <button key={item.key} type="button" aria-label={item.label} aria-current={active === item.key ? "page" : undefined} onClick={() => onSelect?.(item.key)} className={item.key === "mic" ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-spectrum" : `flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-[11px] ${active === item.key ? "text-ink" : "text-muted"}`}>
          <span className={active === item.key || item.key === "mic" ? "" : "opacity-50"}><DesignIcon name={item.icon} /></span>
          {item.key !== "mic" && <span>{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}
