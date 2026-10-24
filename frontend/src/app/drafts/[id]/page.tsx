"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Chip,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import {
  ApiError,
  api,
  type Draft,
  type DraftKind,
  type PersonCard,
} from "@/lib/api";

type Channel = "email" | "linkedin";

const kindLabel: Record<DraftKind, string> = {
  introduction: "Introduction",
  follow_up: "Follow-up",
  referral: "Referral request",
};

const kindTone: Record<DraftKind, "outline" | "cream" | "amber"> = {
  introduction: "outline",
  follow_up: "cream",
  referral: "amber",
};

function DraftReview({ draftId }: { draftId: string }) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<Channel>("email");
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkedinMessage, setLinkedinMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getDraft(draftId);
        if (cancelled) return;
        setDraft(d);
        setSubject(d.subject);
        setBody(d.body);
        setLinkedinMessage(d.linkedin_message);
        try {
          // The draft's own event, not the one currently selected: they differ after switching events.
          const p = await api.getPerson(d.person_id, d.conference_id);
          if (!cancelled) setPerson(p);
        } catch {
          // Non-blocking.
        }
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus("missing");
          return;
        }
        setError(err instanceof ApiError ? describeError(err) : "Could not load draft.");
        setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    return (
      subject !== draft.subject ||
      body !== draft.body ||
      linkedinMessage !== draft.linkedin_message
    );
  }, [draft, subject, body, linkedinMessage]);

  const editedAfterApproval =
    draft !== null &&
    draft.status === "draft" &&
    draft.approved_at !== null;

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateDraft(draft.id, {
        subject: subject.trim(),
        body,
        linkedin_message: linkedinMessage,
      });
      setDraft(updated);
      setSubject(updated.subject);
      setBody(updated.body);
      setLinkedinMessage(updated.linkedin_message);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? describeError(err) : "Could not save edits.");
    } finally {
      setSaving(false);
    }
  }

  async function onApprove() {
    if (!draft) return;
    setApproving(true);
    setError(null);
    try {
      // Persist any pending edits first, in case the user hit Approve directly.
      if (dirty) {
        await api.updateDraft(draft.id, {
          subject: subject.trim(),
          body,
          linkedin_message: linkedinMessage,
        });
      }
      await api.approveDraft(draft.id, {
        subject: subject.trim(),
        body,
        linkedin_message: linkedinMessage,
      });
      router.push(`/drafts/${draft.id}/ready`);
    } catch (err) {
      setError(err instanceof ApiError ? describeError(err) : "Could not approve this draft.");
      setApproving(false);
    }
  }

  if (status === "loading") {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted">Loading draft…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  if (status === "missing" || !draft) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-serif text-[28px] leading-tight text-ink">
            That draft isn’t here anymore.
          </p>
          <p className="text-[14px] text-muted">
            It may have been removed. Check your queue.
          </p>
          <Button variant="secondary" size="md" onClick={() => router.replace("/drafts")}>
            Back to drafts
          </Button>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  const metSummary = (() => {
    if (person?.met) {
      const timeStr = new Date(person.met.date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      return `Met ${timeStr}${person.company ? ` · ${person.company}` : ""}`;
    }
    if (person?.company) return person.company;
    if (person?.title) return person.title;
    return kindLabel[draft.kind];
  })();

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-[14px] px-5 pt-2">
        <div className="flex items-center justify-between pb-1 pt-1">
          <button
            type="button"
            onClick={() => router.push("/drafts")}
            className="flex items-center gap-1 text-[14px] font-medium text-ink"
          >
            <span aria-hidden>‹</span>
            <span>Follow-ups</span>
          </button>
          <Chip tone={kindTone[draft.kind]} className="!text-[12px]">
            {kindLabel[draft.kind]}
          </Chip>
        </div>

        <div className="flex items-center gap-3">
          <Avatar
            name={person?.name ?? "Someone"}
            src={person?.photo_url ?? undefined}
            size="lg"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-[15px] text-ink">
              To {person?.name ?? "them"}
            </p>
            <p className="truncate text-[12px] text-muted">{metSummary}</p>
          </div>
        </div>

        {editedAfterApproval ? (
          <div className="flex items-start gap-3 rounded-[12px] bg-cream px-3.5 py-3">
            <span
              aria-hidden
              className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber"
            />
            <p className="text-[14px] font-medium leading-[1.35] text-ink">
              You edited this after approving. Approve again to copy.
            </p>
          </div>
        ) : null}

        {/* Channel toggle */}
        <div className="flex w-full items-center gap-[2px] rounded-full bg-subtle p-[3px]">
          <ChannelTab
            label="Email"
            active={channel === "email"}
            onClick={() => setChannel("email")}
          />
          <ChannelTab
            label="LinkedIn"
            active={channel === "linkedin"}
            onClick={() => setChannel("linkedin")}
          />
        </div>

        {/* Draft card */}
        <div className="flex flex-col gap-3 rounded-[12px] border border-line bg-card p-4">
          {channel === "email" ? (
            <>
              {editing ? (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-[8px] border border-line bg-card px-3 py-2 font-serif text-[22px] leading-tight tracking-[-0.24px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                />
              ) : (
                <p className="font-serif text-[24px] leading-tight tracking-[-0.24px] text-ink">
                  {subject || "(no subject)"}
                </p>
              )}
              <div className="h-px w-full bg-line" />
              {editing ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[220px] w-full rounded-[8px] border border-line bg-card px-3 py-2 text-[15px] leading-[1.55] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                  placeholder="Write the email body."
                />
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                  {body}
                </p>
              )}
            </>
          ) : (
            <>
              <SectionLabel>LinkedIn message</SectionLabel>
              {editing ? (
                <textarea
                  value={linkedinMessage}
                  onChange={(e) => setLinkedinMessage(e.target.value)}
                  className="min-h-[180px] w-full rounded-[8px] border border-line bg-card px-3 py-2 text-[15px] leading-[1.55] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                  placeholder="Short LinkedIn note."
                />
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                  {linkedinMessage || "(empty)"}
                </p>
              )}
            </>
          )}
        </div>

        {/* Grounded in */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Grounded in</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {draft.grounded_on.length === 0 ? (
              <Chip tone="outline">Your background</Chip>
            ) : (
              draft.grounded_on.map((g) => (
                <Chip key={g.id} tone="neutral" className="!text-[12px]">
                  <span className="text-muted">{labelForType(g.type)}:</span>
                  <span className="ml-1 text-ink">{truncate(g.text, 42)}</span>
                </Chip>
              ))
            )}
          </div>
        </div>

        {error ? (
          <p className="text-[13px] text-alert">{error}</p>
        ) : null}

        <div className="h-4" />
      </div>

      {/* Bottom action bar: sticky above the floating bottom nav so Approve is always reachable. */}
      <div className="sticky bottom-[92px] z-20 mt-auto border-t border-line bg-card px-5 pb-4 pt-3">
        <div className="flex gap-2.5">
          {editing ? (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setSubject(draft.subject);
                  setBody(draft.body);
                  setLinkedinMessage(draft.linkedin_message);
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => void onSave()}
                disabled={saving || !dirty}
              >
                {saving ? "Saving…" : "Save edits"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setEditing(true)}
                leading={<span aria-hidden>✎</span>}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => void onApprove()}
                disabled={approving}
              >
                {approving ? "Approving…" : "Approve & copy"}
              </Button>
            </>
          )}
        </div>
        <p className="pt-2 text-center text-[12px] text-muted">
          Kairos never sends for you.
        </p>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function ChannelTab({
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
        (active ? "bg-card text-ink font-semibold" : "bg-transparent text-muted font-medium")
      }
    >
      {label}
    </button>
  );
}

function labelForType(t: string): string {
  switch (t) {
    case "profile":
      return "You";
    case "person":
      return "Them";
    case "note":
      return "Note";
    case "memory":
      return "Memory";
    case "user_supplied_job":
      return "Job";
    default:
      return t;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function describeError(err: ApiError): string {
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail) && err.detail.length) return err.detail[0].msg;
  return `Request failed (${err.status})`;
}

function DraftReviewRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <RequireProfile>
      <DraftReview draftId={id} />
    </RequireProfile>
  );
}

export default function DraftReviewPage() {
  return (
    <Suspense fallback={null}>
      <DraftReviewRoute />
    </Suspense>
  );
}
