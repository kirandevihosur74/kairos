"use client";

import { useSyncExternalStore } from "react";

const PREFIX = "kairos.tip.";
const listeners = new Set<() => void>();

function seen(id: string): boolean {
  try {
    return window.localStorage.getItem(PREFIX + id) === "1";
  } catch {
    return true; // storage unavailable: never nag
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A one-time hint shown at the moment it matters. "Got it" hides it on this device for good.
 * `pointer` puts the small arrow on the side facing the thing it explains.
 */
export function FirstTip({
  id,
  children,
  pointer = "down",
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  pointer?: "up" | "down";
  className?: string;
}) {
  const visible = useSyncExternalStore(subscribe, () => !seen(id), () => false);
  if (!visible) return null;
  function dismiss() {
    try {
      window.localStorage.setItem(PREFIX + id, "1");
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  }
  const arrow = <span aria-hidden className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-ink ${pointer === "down" ? "-bottom-1.5" : "-top-1.5"}`} />;
  return (
    <div role="note" className={`relative rounded-xl bg-ink px-4 py-3 text-white ${className}`}>
      {arrow}
      <p className="text-[14px] leading-[1.4]">{children}</p>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={dismiss} className="min-h-8 px-1 text-[13px] font-semibold text-cream">
          Got it
        </button>
      </div>
    </div>
  );
}
