"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Chip,
  PhoneShell,
  RequireProfile,
} from "@/components";
import { ApiError, api, type Draft, type DraftKind, type DraftStatus } from "@/lib/api";
import { useSession } from "@/lib/session";

const QUEUE_STORAGE_KEY = "kairos.drafts";

function readQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeQueue(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore quota errors.
  }
}

interface Row {
  draft: Draft;
  personName: string;
  personTitle: string | null;
  photoUrl: string | null;
}

type Filter = "all" | "draft" | "approved";

const kindLabel: Record<DraftKind, string> = {
  introduction: "Introduction",
  follow_up: "Follow-up",
  referral: "Referral",
};

const kindTone: Record<DraftKind, "outline" | "cream" | "amber"> = {
  introduction: "outline",
  follow_up: "cream",
  referral: "amber",
};

const statusTone: Record<DraftStatus, "on" | "outline"> = {
  approved: "on",
  draft: "outline",
};

const statusLabel: Record<DraftStatus, string> = {
  approved: "Approved",
  draft: "Drafted",
};

function DraftsQueue() {
  const router = useRouter();
  const { conferenceId } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (conferenceId === null) {
      router.replace("/event");
    }
  }, [conferenceId, router]);

  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;

    (async () => {
      const ids = readQueue();
      if (ids.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
          setError(null);
        }
        return;
      }

      const results: Row[] = [];
      const keep: string[] = [];
      try {
        for (const id of ids) {
          try {
            const draft = await api.getDraft(id);
            keep.push(id);
            let personName = "Someone";
            let personTitle: string | null = null;
            let photoUrl: string | null = null;
            try {
              const person = await api.getPerson(draft.person_id, conferenceId);
              personName = person.name;
              personTitle = person.title ?? person.company ?? null;
              photoUrl = person.photo_url ?? null;
            } catch {
              // leave fallback name/title.
            }
            results.push({ draft, personName, personTitle, photoUrl });
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              // Drop missing drafts from the queue.
              continue;
            }
            // On transient errors, keep the id so we try again next load.
            keep.push(id);
          }
        }
        if (cancelled) return;
        if (keep.length !== ids.length) writeQueue(keep);
        // Most recent drafts first — queue is append order; reverse it.
        results.reverse();
        setRows(results);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? describeError(err) : "Could not load drafts.",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conferenceId]);

  const total = rows.length;
  const drafted = rows.filter((r) => r.draft.status === "draft").length;
  const approved = rows.filter((r) => r.draft.status === "approved").length;

  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    return r.draft.status === filter;
  });

  const headline =
    total === 0
      ? "Make the first move."
      : total === 1
        ? "Make the first move."
        : "Make the first move.";

  const sub =
    total === 0
      ? "No drafts yet. Pick someone to write to."
      : `${total} ${total === 1 ? "draft" : "drafts"} ready. Nothing sends without you.`;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-[14px] px-5 pt-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[36px] leading-none tracking-[-0.36px] text-ink">
            {headline}
          </h1>
          <p className="text-[14px] text-muted">{sub}</p>
        </div>

        {/* Segmented filter */}
        <div className="flex w-full items-center gap-[2px] rounded-full bg-subtle p-[3px]">
          <FilterTab
            label={`All ${total}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterTab
            label={`Drafted ${drafted}`}
            active={filter === "draft"}
            onClick={() => setFilter("draft")}
          />
          <FilterTab
            label={`Approved ${approved}`}
            active={filter === "approved"}
            onClick={() => setFilter("approved")}
          />
        </div>

        {error ? (
          <div className="rounded-[12px] border border-alert/40 bg-alert/5 px-3 py-2 text-[13px] text-alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="pt-6 text-center text-[13px] text-muted">Loading drafts…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            total={total}
            filter={filter}
            onBrowse={() => router.push("/discover")}
          />
        ) : (
          <div className="flex w-full flex-col overflow-hidden rounded-[12px] border border-line bg-card">
            {visible.map((row, idx) => (
              <button
                key={row.draft.id}
                type="button"
                onClick={() => router.push(`/drafts/${row.draft.id}`)}
                className={
                  "flex w-full items-center gap-3 bg-card px-3.5 py-3 text-left hover:bg-subtle/50 " +
                  (idx === 0 ? "" : "border-t border-line")
                }
              >
                <Avatar
                  name={row.personName}
                  src={row.photoUrl ?? undefined}
                  size="md"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="truncate text-[14px] text-ink">
                    {row.personName}
                  </p>
                  <p className="truncate text-[12px] text-muted">
                    {row.personTitle ?? row.draft.subject}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Chip
                      tone={kindTone[row.draft.kind]}
                      className="!px-2.5 !py-[3px] !text-[11px]"
                    >
                      {kindLabel[row.draft.kind]}
                    </Chip>
                    <Chip
                      tone={statusTone[row.draft.status]}
                      className="!px-2.5 !py-[3px] !text-[11px]"
                    >
                      {statusLabel[row.draft.status]}
                    </Chip>
                  </div>
                </div>
                <span aria-hidden className="text-[18px] text-faint">
                  ›
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-full py-2 text-[13px] transition-colors " +
        (active
          ? "bg-card text-ink"
          : "bg-transparent text-muted font-medium")
      }
    >
      {label}
    </button>
  );
}

function EmptyState({
  total,
  filter,
  onBrowse,
}: {
  total: number;
  filter: Filter;
  onBrowse: () => void;
}) {
  if (total === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-line bg-card px-5 py-10 text-center">
        <p className="font-serif text-[22px] leading-tight text-ink">
          Nothing drafted yet.
        </p>
        <p className="text-[13px] text-muted">
          When you draft a follow-up to someone interesting, it lands here.
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className="pt-1 text-[13px] font-medium text-ink underline underline-offset-2"
        >
          Browse people →
        </button>
      </div>
    );
  }
  return (
    <p className="pt-6 text-center text-[13px] text-muted">
      {filter === "approved"
        ? "Nothing approved yet."
        : "Nothing in draft."}
    </p>
  );
}

function describeError(err: ApiError): string {
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail) && err.detail.length) return err.detail[0].msg;
  return `Request failed (${err.status})`;
}

export default function DraftsPage() {
  return (
    <RequireProfile>
      <DraftsQueue />
    </RequireProfile>
  );
}
