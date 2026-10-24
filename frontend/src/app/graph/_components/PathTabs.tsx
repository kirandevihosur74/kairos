"use client";

import Link from "next/link";

interface PathTabsProps {
  /** The name the "Path to {name}" tab points at. */
  focusName: string | null;
  /** Which tab is active. */
  active: "path" | "everyone";
  /** Route when a user picks the "Path to {name}" tab. */
  pathHref: string;
  /** Route when a user picks the Everyone tab. */
  everyoneHref: string;
}

/**
 * Pill-style tab row used by 6.1 Graph view and 7.1 Everyone.
 * Mirrors the Figma pill: inner white rounded chip for the active tab, bare
 * label for the inactive one.
 */
export function PathTabs({
  focusName,
  active,
  pathHref,
  everyoneHref,
}: PathTabsProps) {
  const pathLabel = `Path to ${focusName ?? "Alex"}`;
  return (
    <div className="inline-flex h-[38px] items-center rounded-full border border-line bg-card p-[3px]">
      <Tab href={pathHref} active={active === "path"}>
        {pathLabel}
      </Tab>
      <Tab href={everyoneHref} active={active === "everyone"}>
        Everyone
      </Tab>
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex h-[32px] items-center rounded-full px-3 text-[13px] " +
        (active
          ? "bg-card font-semibold text-ink"
          : "bg-transparent font-medium text-muted hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
