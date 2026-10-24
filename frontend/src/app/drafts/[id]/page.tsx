"use client";

import Image from "next/image";
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
import { enrich, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

type Channel = "email" | "linkedin";

const kindLabel: Record<DraftKind, string> = {
  introduction: "Introduction",
  follow_up: "Follow-up",
  referral: "Referral request",
};

function DraftReview({ draftId }: { draftId: string }) {
  const router = useRouter();
  const { conferenceId } = useSession();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [enriched, setEnriched] = useState<EnrichedCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<Channel>("email");
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkedinMessage, setLinkedinMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rewriting, setRewriting] = useState(false);

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
          const cid = conferenceId ?? d.conference_id;
          const p = await api.getPerson(d.person_id, cid);
          if (!cancelled) {
            setPerson(p);
            setEnriched(enrich(p));
          }
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
        setError(
          err instanceof ApiError
            ? describeError(err)
            : "Could not load draft.",
        );
        setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, conferenceId]);

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
      setError(
        err instanceof ApiError
          ? describeError(err)
          : "Could not save edits.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onApprove() {
    if (!draft) return;
    setApproving(true);
    setError(null);
    try {
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
      setError(
        err instanceof ApiError
          ? describeError(err)
          : "Could not approve this draft.",
      );
      setApproving(false);
    }
  }

  async function onRewrite() {
    if (!draft) return;
    const cid = conferenceId ?? draft.conference_id;
    setRewriting(true);
    setError(null);
    try {
      const fresh = await api.draftFollowup(
        draft.person_id,
        cid,
        draft.kind,
      );
      setDraft(fresh);
      setSubject(fresh.subject);
      setBody(fresh.body);
      setLinkedinMessage(fresh.linkedin_message);
      // Rewritten drafts have a new id; route there to replace the stale URL.
      if (fresh.id !== draft.id) {
        router.replace(`/drafts/${fresh.id}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? describeError(err)
          : "Could not rewrite this draft.",
      );
    } finally {
      setRewriting(false);
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
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.replace("/drafts")}
          >
            Back to drafts
          </Button>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  const metSummary = (() => {
    if (person?.met) {
      const timeStr = new Date(person.met.created_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      return `Met ${timeStr}${person.company ? ` · ${person.company}` : ""}`;
    }
    if (person?.company) return person.company;
    if (person?.title) return person.title;
    return kindLabel[draft.kind];
  })();

  const notesCount = person?.notes?.length ?? 0;
  const talkTitle = enriched?.session_slot?.title ?? null;
  const connector = enriched?.warm_intro_hint?.connector ?? null;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-[14px] px-5 pt-1">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-1 pt-1">
          <button
            type="button"
            onClick={() => router.push("/drafts")}
            className="flex items-center gap-1 text-[14px] font-medium text-ink"
          >
            <span aria-hidden>‹</span>
            <span>Follow-ups</span>
          </button>
          <button
            type="button"
            onClick={() => void onRewrite()}
            disabled={rewriting}
            className="flex items-center gap-1.5 text-[13px] font-medium text-muted disabled:opacity-50"
            aria-label="Rewrite draft"
          >
            <RefreshIcon />
            <span>{rewriting ? "Rewriting…" : "Rewrite"}</span>
          </button>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-3">
          <Avatar
            name={person?.name ?? "Someone"}
            src={person?.photo_url ?? undefined}
            size="md"
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

        {/* Draft content card — read-only preview */}
        <div className="flex flex-col gap-[10px] rounded-[12px] border border-line bg-card p-4">
          {channel === "email" ? (
            <>
              <p className="font-serif text-[24px] leading-tight tracking-[-0.24px] text-ink">
                {subject || "(no subject)"}
              </p>
              <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                {body}
              </p>
            </>
          ) : (
            <>
              <SectionLabel>LinkedIn message</SectionLabel>
              <p className="whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                {linkedinMessage || "(empty)"}
              </p>
            </>
          )}
        </div>

        {/* Grounded in */}
        <div className="flex flex-col gap-2">
          <SectionLabel className="tracking-[0.48px]">GROUNDED IN</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            <GroundedChip
              emoji="/emoji/note.svg"
              label={
                notesCount > 0
                  ? `Your ${notesCount} note${notesCount === 1 ? "" : "s"}`
                  : "Your note"
              }
            />
            {talkTitle ? (
              <GroundedChip emoji="/emoji/speaker.svg" label="Her talk" />
            ) : null}
            {connector ? (
              <GroundedChip
                emoji="/emoji/warm-intro.svg"
                label={`${connector} intro`}
              />
            ) : null}
            {draft.grounded_on.length === 0 &&
            !talkTitle &&
            !connector &&
            notesCount === 0 ? (
              <Chip tone="outline">Your background</Chip>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="text-[13px] text-alert">{error}</p>
        ) : null}

        <div className="h-4" />
      </div>

      {/* Bottom action bar */}
      <div className="mt-auto border-t border-line bg-card px-5 pb-4 pt-3">
        <div className="flex gap-2.5">
          <Button
            variant="ghost"
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
        </div>
        <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[12px] text-muted">
          <ShieldIcon />
          <span>Opens Gmail. Kairos never sends for you.</span>
        </p>
      </div>

      {editing ? (
        <EditSheet
          subject={subject}
          body={body}
          linkedinMessage={linkedinMessage}
          onChangeSubject={setSubject}
          onChangeBody={setBody}
          onChangeLinkedin={setLinkedinMessage}
          dirty={dirty}
          saving={saving}
          onCancel={() => {
            setSubject(draft.subject);
            setBody(draft.body);
            setLinkedinMessage(draft.linkedin_message);
            setEditing(false);
          }}
          onSave={() => void onSave()}
        />
      ) : null}

      <AppNav />
    </PhoneShell>
  );
}

function GroundedChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-[12px] font-medium text-ink">
      <Image src={emoji} alt="" width={14} height={14} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function EditSheet({
  subject,
  body,
  linkedinMessage,
  onChangeSubject,
  onChangeBody,
  onChangeLinkedin,
  dirty,
  saving,
  onCancel,
  onSave,
}: {
  subject: string;
  body: string;
  linkedinMessage: string;
  onChangeSubject: (v: string) => void;
  onChangeBody: (v: string) => void;
  onChangeLinkedin: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-label="Edit draft"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[20px] bg-paper px-5 pb-6 pt-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <p className="pb-3 font-serif text-[22px] leading-tight tracking-[-0.22px] text-ink">
          Edit draft
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <SectionLabel>SUBJECT</SectionLabel>
            <input
              value={subject}
              onChange={(e) => onChangeSubject(e.target.value)}
              placeholder="Subject"
              className="h-12 rounded-[12px] border border-line bg-card px-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <SectionLabel>EMAIL BODY</SectionLabel>
            <textarea
              value={body}
              onChange={(e) => onChangeBody(e.target.value)}
              className="min-h-[180px] rounded-[12px] border border-line bg-card px-3 py-2 text-[15px] leading-[1.5] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              placeholder="Write the email body."
            />
          </div>
          <div className="flex flex-col gap-1">
            <SectionLabel>LINKEDIN MESSAGE</SectionLabel>
            <textarea
              value={linkedinMessage}
              onChange={(e) => onChangeLinkedin(e.target.value)}
              className="min-h-[120px] rounded-[12px] border border-line bg-card px-3 py-2 text-[15px] leading-[1.5] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              placeholder="Short LinkedIn note."
            />
          </div>
        </div>
        <div className="flex gap-2.5 pt-4">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={onSave}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save edits"}
          </Button>
        </div>
      </div>
    </div>
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
        (active
          ? "bg-card text-ink font-semibold"
          : "bg-transparent text-muted font-medium")
      }
    >
      {label}
    </button>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M3 9a6 6 0 0 1 10.5-4" />
      <path d="M15 9a6 6 0 0 1-10.5 4" />
      <path d="M13.5 2.5v3H10.5" />
      <path d="M4.5 15.5v-3H7.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className="h-[14px] w-[14px]"
      aria-hidden
    >
      <path d="M7 1.5l5 2v4c0 3-2.5 5-5 5s-5-2-5-5v-4l5-2z" />
    </svg>
  );
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
