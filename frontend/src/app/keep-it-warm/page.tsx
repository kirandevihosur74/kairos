"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Card,
  Chip,
  PhoneShell,
  SectionLabel,
  useToast,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

// ---------------------------------------------------------------------------
// Local follow-up model. Backend TODO: GET /followups/due returns a typed
// list already bucketed by "due today | this week | going cold". For now we
// compute it on the client from `api.listPeople(..., "interesting")` + each
// card's `met` + `notes[]` recency.
// ---------------------------------------------------------------------------
type Bucket = "due_today" | "this_week" | "going_cold";

interface FollowupRow {
  personId: string;
  name: string;
  photoUrl: string | null;
  bucket: Bucket;
  // Human-readable "Met N days ago" line.
  met: string;
  // Human-readable sub (e.g. "draft ready", "no draft yet").
  draftLine: string;
  // What kind of action chip to show.
  action: "review" | "draft" | "nudge" | "check_in";
}

const NUDGE_KEY = "kairos.nudge_prefs";
const DEFAULT_NUDGE = true;

function readNudge(): boolean {
  if (typeof window === "undefined") return DEFAULT_NUDGE;
  try {
    const raw = window.localStorage.getItem(NUDGE_KEY);
    if (raw === null) return DEFAULT_NUDGE;
    return raw === "true";
  } catch {
    return DEFAULT_NUDGE;
  }
}

function writeNudge(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NUDGE_KEY, String(v));
  } catch {
    // ignore
  }
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function bucketFor(days: number): Bucket {
  if (days <= 2) return "due_today";
  if (days <= 7) return "this_week";
  return "going_cold";
}

function metLine(days: number): string {
  if (days === 0) return "Met today";
  if (days === 1) return "Met 1 day ago";
  if (days <= 13) return `Met ${days} days ago`;
  const weeks = Math.round(days / 7);
  return `Met ${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

function toFollowup(card: PersonCard): FollowupRow {
  const metAt = card.met?.created_at ?? card.notes[0]?.created_at ?? null;
  const days = metAt ? daysSince(metAt) : 0;
  const bucket = bucketFor(days);
  const hasDraft = card.notes.length > 0;

  const draftLine =
    bucket === "due_today"
      ? hasDraft
        ? "draft ready"
        : "draft ready"
      : bucket === "this_week"
      ? hasDraft
        ? "intro via Priya · waiting on her"
        : "no draft yet"
      : `Met at ${card.conference_id.split(":").pop() ?? "a past event"}`;

  const action: FollowupRow["action"] =
    bucket === "due_today"
      ? "review"
      : bucket === "going_cold"
      ? "check_in"
      : hasDraft
      ? "nudge"
      : "draft";

  return {
    personId: card.id,
    name: card.name,
    photoUrl: card.photo_url,
    bucket,
    met: metLine(days),
    draftLine,
    action,
  };
}

// Fallback demo rows so the screen is useful without a live event in session.
const DEMO_ROWS: FollowupRow[] = [
  {
    personId: "demo:taylor",
    name: "Taylor Chen",
    photoUrl: null,
    bucket: "due_today",
    met: "Met 2 days ago",
    draftLine: "draft ready",
    action: "review",
  },
  {
    personId: "demo:jordan",
    name: "Jordan Lee",
    photoUrl: null,
    bucket: "this_week",
    met: "Met 5 days ago",
    draftLine: "no draft yet",
    action: "draft",
  },
  {
    personId: "demo:alex",
    name: "Alex Morgan",
    photoUrl: null,
    bucket: "this_week",
    met: "Intro via Priya",
    draftLine: "waiting on her",
    action: "nudge",
  },
  {
    personId: "demo:sam",
    name: "Sam Rivera",
    photoUrl: null,
    bucket: "going_cold",
    met: "Met 3 weeks ago at KubeCon",
    draftLine: "",
    action: "check_in",
  },
];

interface RowProps {
  row: FollowupRow;
  withDivider?: boolean;
  onAction: (row: FollowupRow) => void;
}

function FollowupRowView({ row, withDivider, onAction }: RowProps) {
  const sub = row.draftLine ? `${row.met} · ${row.draftLine}` : row.met;

  let chip: React.ReactNode = null;
  if (row.action === "review") {
    chip = (
      // Ink (strong) action: implemented as a solid-ink Chip since Chip has
      // no built-in "ink" tone and the design calls for an inline tap target.
      <button
        type="button"
        onClick={() => onAction(row)}
        className="inline-flex items-center rounded-full bg-ink px-[10px] py-[5px] text-[12px] font-medium text-white"
      >
        Review
      </button>
    );
  } else if (row.action === "draft") {
    chip = (
      <button
        type="button"
        onClick={() => onAction(row)}
        className="inline-flex"
      >
        <Chip tone="outline">Draft</Chip>
      </button>
    );
  } else if (row.action === "nudge") {
    chip = (
      <button
        type="button"
        onClick={() => onAction(row)}
        className="inline-flex"
      >
        <Chip tone="outline">Nudge Priya</Chip>
      </button>
    );
  } else if (row.action === "check_in") {
    chip = (
      <button
        type="button"
        onClick={() => onAction(row)}
        className="inline-flex"
      >
        <Chip tone="outline">Check in</Chip>
      </button>
    );
  }

  return (
    <div
      className={
        "flex items-center gap-3 px-4 py-3 " +
        (withDivider ? "border-t border-line" : "")
      }
    >
      <Avatar
        name={row.name}
        src={row.photoUrl}
        size="md"
        strongFit={row.bucket === "due_today"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{row.name}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted">{sub}</p>
      </div>
      {chip}
    </div>
  );
}

export default function KeepItWarmPage() {
  const router = useRouter();
  const { conferenceId } = useSession();
  const { showToast } = useToast();

  const [rows, setRows] = useState<FollowupRow[]>(DEMO_ROWS);
  const [nudge, setNudge] = useState<boolean>(DEFAULT_NUDGE);

  useEffect(() => {
    // Deferred via microtask so the state update happens outside the effect
    // body (avoids react-hooks/set-state-in-effect).
    queueMicrotask(() => setNudge(readNudge()));
  }, []);

  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.listPeople(conferenceId, "interesting").then(
      (people) => {
        if (cancelled) return;
        if (!people.length) return;
        const built = people
          .map(toFollowup)
          // Order: due_today, this_week, going_cold
          .sort((a, b) => {
            const order: Record<Bucket, number> = {
              due_today: 0,
              this_week: 1,
              going_cold: 2,
            };
            return order[a.bucket] - order[b.bucket];
          });
        setRows(built);
      },
      (err) => {
        if (!(err instanceof ApiError)) return;
        // Non-fatal: keep demo rows.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId]);

  const byBucket = useMemo(() => {
    const out: Record<Bucket, FollowupRow[]> = {
      due_today: [],
      this_week: [],
      going_cold: [],
    };
    for (const r of rows) out[r.bucket].push(r);
    return out;
  }, [rows]);

  const toggleNudge = useCallback(
    (next: boolean) => {
      setNudge(next);
      writeNudge(next);
      // Backend TODO: PATCH /me/nudge_preferences { nudge_after_days: 2 }
    },
    [],
  );

  const handleAction = useCallback(
    (row: FollowupRow) => {
      if (row.action === "review") {
        router.push(`/drafts`);
      } else if (row.action === "draft") {
        router.push(`/person/${row.personId}`);
      } else {
        showToast(
          row.action === "nudge"
            ? "Nudge sent."
            : "Check-in draft started.",
        );
      }
    },
    [router, showToast],
  );

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-2">
        <Link
          href="/today"
          className="text-[15px] font-medium text-ink"
        >
          &lsaquo; Today
        </Link>

        <div className="flex items-center gap-3">
          <Image
            src="/emoji/warm.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <h1 className="font-serif text-[34px] leading-tight text-ink">
            Keep it warm
          </h1>
        </div>

        <p className="text-[13px] leading-snug text-muted">
          Follow up within 48 hours and people remember you.
        </p>

        {/* DUE TODAY */}
        {byBucket.due_today.length ? (
          <>
            <SectionLabel>DUE TODAY</SectionLabel>
            <Card tone="plain" radius="md" padded={false}>
              {byBucket.due_today.map((r, i) => (
                <FollowupRowView
                  key={r.personId}
                  row={r}
                  withDivider={i > 0}
                  onAction={handleAction}
                />
              ))}
            </Card>
          </>
        ) : null}

        {/* THIS WEEK */}
        {byBucket.this_week.length ? (
          <>
            <SectionLabel>THIS WEEK</SectionLabel>
            <Card tone="plain" radius="md" padded={false}>
              {byBucket.this_week.map((r, i) => (
                <FollowupRowView
                  key={r.personId}
                  row={r}
                  withDivider={i > 0}
                  onAction={handleAction}
                />
              ))}
            </Card>
          </>
        ) : null}

        {/* GOING COLD */}
        {byBucket.going_cold.length ? (
          <>
            <SectionLabel className="text-alert">GOING COLD</SectionLabel>
            <Card tone="subtle" radius="md" padded={false}>
              {byBucket.going_cold.map((r, i) => (
                <FollowupRowView
                  key={r.personId}
                  row={r}
                  withDivider={i > 0}
                  onAction={handleAction}
                />
              ))}
            </Card>
          </>
        ) : null}

        {/* Nudge preference */}
        <Card tone="plain" radius="md" padded={false}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-[14px] font-medium text-ink">
              Nudge me 2 days after we meet
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={nudge}
              aria-label="Nudge me 2 days after we meet"
              onClick={() => toggleNudge(!nudge)}
              className={
                "relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border transition-colors " +
                (nudge
                  ? "border-transparent bg-spectrum"
                  : "border-line bg-subtle")
              }
            >
              <span
                aria-hidden
                className={
                  "inline-block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(55,53,47,0.2)] transition-transform " +
                  (nudge ? "translate-x-[20px]" : "translate-x-[2px]")
                }
              />
            </button>
          </div>
        </Card>
      </div>
    </PhoneShell>
  );
}
