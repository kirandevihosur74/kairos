"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  PhoneShell,
  useToast,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

// ---------------------------------------------------------------------------
// Local inline type: HiddenEntry. Hiding is persisted client-side in
// localStorage until the backend learns about `decision="hidden"` + `scope`.
// Backend TODO: POST /triage { decision: "hidden", scope: "conference" | "global" }
// ---------------------------------------------------------------------------
type HideScope = "conference" | "global";
interface HiddenEntry {
  personId: string;
  scope: HideScope;
  conferenceId?: string | null;
  hiddenAt: string;
}

const STORAGE_KEY = "kairos.hidden";

function readHidden(): HiddenEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HiddenEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHidden(entries: HiddenEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota errors.
  }
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

interface OptionProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}

function HideOption({ selected, label, onClick }: OptionProps) {
  return (
    <Card
      tone={selected ? "attention" : "plain"}
      radius="md"
      padded={false}
      className={
        "w-full cursor-pointer transition-colors " +
        (selected ? "" : "hover:bg-subtle")
      }
      as="div"
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        {selected ? (
          <span
            aria-hidden
            className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink"
          />
        ) : (
          <span
            aria-hidden
            className="inline-block h-[18px] w-[18px] rounded-full border border-line bg-card"
          />
        )}
        <span className="text-[15px] font-semibold text-ink">{label}</span>
      </button>
    </Card>
  );
}

function HidePageInner({ id }: { id: string }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const { showToast } = useToast();

  const [person, setPerson] = useState<PersonCard | null>(null);
  const [scope, setScope] = useState<HideScope>("conference");

  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.getPerson(id, conferenceId).then(
      (p) => {
        if (!cancelled) setPerson(p);
      },
      (err) => {
        if (!(err instanceof ApiError)) return;
        // Non-fatal; dialog still renders with fallback copy.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, conferenceId]);

  const firstName = useMemo(() => {
    if (!person) return "them";
    return person.name.split(" ")[0] ?? person.name;
  }, [person]);

  const fullName = person?.name ?? "this person";

  // Build the per-conference label. If we don't yet know the conference name,
  // say "this event".
  const conferenceLabel = useMemo(() => {
    // The person card holds conference_id but not the conference name; the
    // design shows the conference name in the chip. "this event" is a safe
    // human fallback.
    return `Just for this event`;
  }, []);

  const handleHide = () => {
    const entries = readHidden();
    const next: HiddenEntry[] = [
      ...entries.filter((e) => e.personId !== id),
      {
        personId: id,
        scope,
        conferenceId: scope === "conference" ? conferenceId : null,
        hiddenAt: new Date().toISOString(),
      },
    ];
    writeHidden(next);

    // Backend TODO: once /triage accepts "hidden" + scope, call it here. For
    // now we persist locally so Your data → Hidden people can read it.
    showToast(`${firstName} is hidden`);
    router.back();
  };

  const handleClose = () => router.back();

  return (
    <PhoneShell withNavSpacer={false}>
      {/* Dim backdrop */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleClose}
        className="absolute inset-0 z-0 bg-ink/40"
      />

      {/* Bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <div className="pointer-events-auto w-full max-w-[430px] rounded-t-[20px] border border-line bg-card shadow-[0_-8px_24px_rgba(55,53,47,0.08)]">
          <div className="relative px-5 pt-3 pb-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-subtle"
            >
              <CloseIcon />
            </button>

            <h1 className="pr-10 font-serif text-[28px] leading-tight text-ink">
              Hide {fullName}?
            </h1>
            <p className="mt-3 text-[14px] leading-snug text-muted">
              {firstName} won&rsquo;t appear in Discover, the graph or
              suggestions. Your notes stay private to you.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <HideOption
                selected={scope === "conference"}
                onClick={() => setScope("conference")}
                label={conferenceLabel}
              />
              <HideOption
                selected={scope === "global"}
                onClick={() => setScope("global")}
                label="At every event"
              />
            </div>

            <p className="mt-4 text-[12px] text-muted">
              You can undo this anytime in Your data &rarr; Hidden people.
            </p>

            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleHide}
              >
                Hide
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function HidePageRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return <HidePageInner id={id} />;
}

export default function HidePage() {
  return (
    <Suspense fallback={null}>
      <HidePageRoute />
    </Suspense>
  );
}
