"use client";

import type { ReactNode } from "react";

export type NavKey = "today" | "discover" | "mic" | "sheet" | "drafts";

export interface BottomNavProps {
  active?: NavKey;
  onSelect?: (key: NavKey) => void;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.25" />
      <path d="m14.5 9.5-1.6 4-4 1.6 1.6-4z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 9h16M9 4v16" />
    </svg>
  );
}

function DraftsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M5 4.5h9.5L19 9v10.5A1.5 1.5 0 0 1 17.5 21H5a1.5 1.5 0 0 1-1.5-1.5v-13.5A1.5 1.5 0 0 1 5 4.5z" />
      <path d="M14 4.5V9h4.5" />
    </svg>
  );
}

const items: {
  key: Exclude<NavKey, "mic">;
  label: string;
  icon: ReactNode;
}[] = [
  { key: "today", label: "Today", icon: <TodayIcon /> },
  { key: "discover", label: "Discover", icon: <DiscoverIcon /> },
  { key: "sheet", label: "Sheet", icon: <SheetIcon /> },
  { key: "drafts", label: "Drafts", icon: <DraftsIcon /> },
];

export function BottomNav({ active = "today", onSelect }: BottomNavProps) {
  const sides = [items.slice(0, 2), items.slice(2)];
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] justify-center px-4 pb-5"
    >
      <div className="pointer-events-auto relative flex w-full items-center justify-between rounded-full border border-line bg-card/95 px-2 py-2 backdrop-blur">
        <div className="flex flex-1 justify-around">
          {sides[0]!.map((item) => (
            <NavButton
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={active === item.key}
              onClick={() => onSelect?.(item.key)}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Capture voice note"
          onClick={() => onSelect?.("mic")}
          className={cn(
            "mx-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-spectrum text-ink transition-transform",
            active === "mic" ? "scale-105" : "hover:scale-[1.03]",
          )}
        >
          <MicIcon />
        </button>

        <div className="flex flex-1 justify-around">
          {sides[1]!.map((item) => (
            <NavButton
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={active === item.key}
              onClick={() => onSelect?.(item.key)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
        active ? "text-ink" : "text-faint hover:text-muted",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
