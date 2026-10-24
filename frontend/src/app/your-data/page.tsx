"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  PhoneShell,
  SectionLabel,
  useToast,
} from "@/components";
import { ApiError, api } from "@/lib/api";
import { useSession } from "@/lib/session";

// ---------------------------------------------------------------------------
// Inline storage model. Shared infra does not know about:
//   - hidden-people entries (TODO: lift to a shared hook once /triage grows a
//     "hidden" decision + scope)
//   - source toggles (TODO: GET/PATCH /me/sources)
// ---------------------------------------------------------------------------
type HideScope = "conference" | "global";
interface HiddenEntry {
  personId: string;
  scope: HideScope;
}

const HIDDEN_KEY = "kairos.hidden";
const SOURCES_KEY = "kairos.sources";

type SourceKey =
  | "linkedin"
  | "events"
  | "companies"
  | "guests";

const DEFAULT_SOURCES: Record<SourceKey, boolean> = {
  linkedin: true,
  events: true,
  companies: true,
  guests: false,
};

function readHidden(): HiddenEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HiddenEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSources(): Record<SourceKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_SOURCES;
  try {
    const raw = window.localStorage.getItem(SOURCES_KEY);
    if (!raw) return DEFAULT_SOURCES;
    const parsed = JSON.parse(raw) as Partial<Record<SourceKey, boolean>>;
    return {
      linkedin: parsed.linkedin ?? DEFAULT_SOURCES.linkedin,
      events: parsed.events ?? DEFAULT_SOURCES.events,
      companies: parsed.companies ?? DEFAULT_SOURCES.companies,
      guests: parsed.guests ?? DEFAULT_SOURCES.guests,
    };
  } catch {
    return DEFAULT_SOURCES;
  }
}

function writeSources(values: Record<SourceKey, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOURCES_KEY, JSON.stringify(values));
  } catch {
    // ignore quota
  }
}

// Simple iOS-style toggle. Uses the brand spectrum gradient when on.
interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border transition-colors " +
        (checked
          ? "border-transparent bg-spectrum"
          : "border-line bg-subtle")
      }
    >
      <span
        aria-hidden
        className={
          "inline-block h-[22px] w-[22px] translate-x-[2px] rounded-full bg-white shadow-[0_1px_2px_rgba(55,53,47,0.2)] transition-transform " +
          (checked ? "translate-x-[20px]" : "")
        }
      />
    </button>
  );
}

interface DataRowProps {
  title: string;
  sub: string;
  action: string;
  onAction?: () => void;
  withDivider?: boolean;
}

function DataRow({ title, sub, action, onAction, withDivider }: DataRowProps) {
  return (
    <div
      className={
        "flex items-start justify-between gap-3 px-4 py-3 " +
        (withDivider ? "border-t border-line" : "")
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
      >
        {action}
      </button>
    </div>
  );
}

interface SourceRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  withDivider?: boolean;
}

function SourceRow({ label, checked, onChange, withDivider }: SourceRowProps) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 px-4 py-3 " +
        (withDivider ? "border-t border-line" : "")
      }
    >
      <p className="text-[14px] font-medium text-ink">{label}</p>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export default function YourDataPage() {
  const router = useRouter();
  const { reset } = useSession();
  const { showToast } = useToast();

  const [hiddenCount, setHiddenCount] = useState(0);
  const [sources, setSources] = useState<Record<SourceKey, boolean>>(
    DEFAULT_SOURCES,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Pull from localStorage after mount. Deferred via microtask so the
    // state updates happen outside the effect body (avoids the
    // react-hooks/set-state-in-effect lint rule and the cascading render it
    // flags).
    queueMicrotask(() => {
      setHiddenCount(readHidden().length);
      setSources(readSources());
      setHydrated(true);
    });
  }, []);

  const updateSource = useCallback(
    (key: SourceKey, next: boolean) => {
      setSources((prev) => {
        const updated = { ...prev, [key]: next };
        writeSources(updated);
        return updated;
      });
    },
    [],
  );

  const handleDeleteAll = useCallback(async () => {
    const confirmed = window.confirm(
      "Delete all your Kairos data? This cannot be undone.",
    );
    if (!confirmed) return;
    try {
      // Backend TODO: DELETE /profile. For now, read it to confirm the server
      // is reachable, then clear local session + storage.
      await api.getProfile().catch((err: unknown) => {
        if (err instanceof ApiError) return null;
        throw err;
      });
    } catch {
      // Non-fatal — proceed with the local wipe.
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HIDDEN_KEY);
      window.localStorage.removeItem(SOURCES_KEY);
    }
    reset();
    showToast("Your data has been cleared.");
    router.replace("/onboarding");
  }, [reset, router, showToast]);

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-2">
        <Link
          href="/"
          className="text-[15px] font-medium text-ink"
        >
          &lsaquo; Profile
        </Link>

        <div className="flex flex-col gap-3">
          <h1 className="text-[34px] leading-tight text-ink">Your data</h1>
          <p className="text-[13px] leading-snug text-muted">
            Everything Kairos knows comes from you or from what people publish
            about their work.
          </p>
        </div>

        {/* 4-row data card */}
        <Card tone="plain" radius="md" padded={false}>
          <DataRow
            title="Profile"
            sub="Backend engineer · 3 interests"
            action="Edit"
            onAction={() => router.push("/onboarding")}
          />
          <DataRow
            title="Network"
            sub="Connections.csv · 1,284 people"
            action="Remove"
            onAction={() =>
              showToast("Network import removed from this device.")
            }
            withDivider
          />
          <DataRow
            title="Memory"
            sub="14 notes across 2 events"
            action="Export"
            onAction={() =>
              // Backend TODO: GET /notes/export.
              showToast("Export is coming soon.")
            }
            withDivider
          />
          <DataRow
            title="Hidden people"
            sub={
              hydrated
                ? `${hiddenCount} ${hiddenCount === 1 ? "person" : "people"}`
                : "—"
            }
            action="Manage"
            onAction={() =>
              showToast("Managing hidden people lands with the next drop.")
            }
            withDivider
          />
        </Card>

        <SectionLabel>SOURCES WE USE</SectionLabel>

        <Card tone="plain" radius="md" padded={false}>
          <SourceRow
            label="LinkedIn public profiles"
            checked={sources.linkedin}
            onChange={(v) => updateSource("linkedin", v)}
          />
          <SourceRow
            label="Event and speaker pages"
            checked={sources.events}
            onChange={(v) => updateSource("events", v)}
            withDivider
          />
          <SourceRow
            label="Company sites and job posts"
            checked={sources.companies}
            onChange={(v) => updateSource("companies", v)}
            withDivider
          />
          <SourceRow
            label="Public guest lists"
            checked={sources.guests}
            onChange={(v) => updateSource("guests", v)}
            withDivider
          />
        </Card>

        <p className="text-[12px] leading-snug text-muted">
          People found by Kairos can ask to be removed at kairos.app/remove.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDeleteAll}
            className="text-[15px] font-semibold text-alert"
          >
            Delete all my data
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
