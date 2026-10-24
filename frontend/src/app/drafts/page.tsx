"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Chip,
  PhoneShell,
  RequireProfile,
} from "@/components";
import {
  ApiError,
  api,
  type Draft,
  type PersonCard,
} from "@/lib/api";
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

interface DraftRow {
  kind: "draft";
  id: string;
  draft: Draft;
  personName: string;
  subtitle: string;
  photoUrl: string | null;
}

interface NeedsNoteRow {
  kind: "needs_note";
  id: string;
  personId: string;
  personName: string;
  subtitle: string;
  photoUrl: string | null;
}

type Row = DraftRow | NeedsNoteRow;

type Filter = "all" | "draft" | "approved";

type StatusKey = "drafted" | "approved" | "needs_note";

const statusLabel: Record<StatusKey, string> = {
  drafted: "Drafted",
  approved: "Approved",
  needs_note: "Needs note",
};

const statusEmoji: Record<StatusKey, string> = {
  drafted: "/emoji/follow-up.svg",
  approved: "/emoji/met.svg",
  needs_note: "/emoji/note.svg",
};

function statusForDraft(d: Draft): StatusKey {
  return d.status === "approved" ? "approved" : "drafted";
}

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
      const draftIds = readQueue();
      const draftRows: DraftRow[] = [];
      const keep: string[] = [];

      try {
        for (const id of draftIds) {
          try {
            const draft = await api.getDraft(id);
            keep.push(id);
            let personName = "Someone";
            let subtitle = draft.subject;
            let photoUrl: string | null = null;
            try {
              const person = await api.getPerson(
                draft.person_id,
                conferenceId,
              );
              personName = person.name;
              subtitle = draft.subject || person.title || person.company || "";
              photoUrl = person.photo_url ?? null;
            } catch {
              // Fall back.
            }
            draftRows.push({
              kind: "draft",
              id: draft.id,
              draft,
              personName,
              subtitle,
              photoUrl,
            });
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) continue;
            keep.push(id);
          }
        }

        if (cancelled) return;
        if (keep.length !== draftIds.length) writeQueue(keep);

        // Needs-note rows: interesting people with no met note.
        let needsNote: NeedsNoteRow[] = [];
        try {
          const interesting = await api.listPeople(
            conferenceId,
            "interesting",
          );
          const draftedPersonIds = new Set(
            draftRows.map((r) => r.draft.person_id),
          );
          needsNote = interesting
            .filter((p: PersonCard) => p.met === null)
            .filter((p: PersonCard) => !draftedPersonIds.has(p.id))
            .map((p: PersonCard) => ({
              kind: "needs_note" as const,
              id: `needs:${p.id}`,
              personId: p.id,
              personName: p.name,
              subtitle: "Add a note first",
              photoUrl: p.photo_url ?? null,
            }));
        } catch {
          // Non-blocking.
        }

        if (cancelled) return;
        // Most-recent drafts first; needs-note after.
        draftRows.reverse();
        setRows([...draftRows, ...needsNote]);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? describeError(err)
            : "Could not load drafts.",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conferenceId]);

  const drafted = rows.filter(
    (r) => r.kind === "draft" && r.draft.status === "draft",
  ).length;
  const approved = rows.filter(
    (r) => r.kind === "draft" && r.draft.status === "approved",
  ).length;
  const total = rows.length;

  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    if (r.kind !== "draft") return filter === "draft";
    return r.draft.status === filter;
  });

  const sub =
    total === 0
      ? "No drafts yet. Pick someone to write to."
      : `${total} ${total === 1 ? "draft" : "drafts"} ready. Nothing sends without you.`;

  // First Drafted row index for highlight.
  const firstDraftedIndex = visible.findIndex(
    (r) => r.kind === "draft" && r.draft.status === "draft",
  );

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-[14px] px-5 pt-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[36px] leading-none tracking-[-0.36px] text-ink">
            Make the first move.
          </h1>
          <p className="text-[14px] text-muted">{sub}</p>
        </div>

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
          <p className="pt-6 text-center text-[13px] text-muted">
            Loading drafts…
          </p>
        ) : visible.length === 0 ? (
          <EmptyState
            total={total}
            filter={filter}
            onBrowse={() => router.push("/discover")}
          />
        ) : (
          <div className="flex w-full flex-col overflow-hidden rounded-[12px] border border-line bg-card">
            {visible.map((row, idx) => {
              const highlight = idx === firstDraftedIndex;
              const status: StatusKey =
                row.kind === "draft" ? statusForDraft(row.draft) : "needs_note";
              const divider = idx === 0 ? "" : "border-t border-line";
              const bg = highlight ? "bg-cream" : "bg-card";
              const onClick =
                row.kind === "draft"
                  ? () => router.push(`/drafts/${row.draft.id}`)
                  : () =>
                      router.push(
                        `/person/${encodeURIComponent(row.personId)}/note`,
                      );
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={onClick}
                  className={`flex w-full items-center gap-3 pl-3.5 pr-3 py-3 text-left ${bg} ${divider}`}
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
                      {row.subtitle}
                    </p>
                    <div className="pt-0.5">
                      <StatusChip
                        status={status}
                        highlighted={highlight && status === "drafted"}
                      />
                    </div>
                  </div>
                  <span aria-hidden className="text-[18px] text-faint">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function StatusChip({
  status,
  highlighted,
}: {
  status: StatusKey;
  highlighted?: boolean;
}) {
  // Status chips are always neutral; emoji carries semantic color.
  // The highlighted "next action" row uses a white pill against the cream row.
  const bg = highlighted ? "bg-card" : "bg-subtle";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[2px] text-[11px] font-medium text-ink ${bg}`}
    >
      <Image
        src={statusEmoji[status]}
        alt=""
        width={14}
        height={14}
        aria-hidden
      />
      <span>{statusLabel[status]}</span>
    </span>
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
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 rounded-full py-2 text-[13px] text-ink"
      >
        <Chip
          tone="gradient"
          className="!px-3 !py-[6px] !text-[13px] !font-medium"
        >
          {label}
        </Chip>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-full py-2 text-[13px] font-medium text-muted"
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
      {filter === "approved" ? "Nothing approved yet." : "Nothing in draft."}
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
