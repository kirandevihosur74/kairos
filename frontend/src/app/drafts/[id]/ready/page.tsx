"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AppNav,
  Button,
  PhoneShell,
  RequireProfile,
  SectionLabel,
  useToast,
} from "@/components";
import { ApiError, api, type Draft, type PersonCard } from "@/lib/api";

function Ready({ draftId }: { draftId: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [autocopy, setAutocopy] = useState(false);
  const [copySucceeded, setCopySucceeded] = useState(false);

  const [copied, setCopied] = useState<"email" | "linkedin" | "subject" | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getDraft(draftId).then(
      async (d) => {
        if (cancelled) return;
        if (d.status !== "approved") { router.replace(`/drafts/${encodeURIComponent(d.id)}`); return; }
        setDraft(d);
        try {
          const p = await api.getPerson(d.person_id, d.conference_id);
          if (!cancelled) setPerson(p);
        } catch {
          // non-blocking
        }
        if (!cancelled) setStatus("ready");
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus("missing");
          return;
        }
        setStatus("ready");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [draftId, router]);

  // Autocopy the email body on arrival once per draft.
  useEffect(() => {
    if (!draft || autocopy) return;
    if (draft.status !== "approved") return;
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const payload = formatEmail(draft);
    navigator.clipboard.writeText(payload).then(
      () => {
        setAutocopy(true);
        setCopySucceeded(true);
        showToast("Copied");
      },
      () => {
        setAutocopy(true);
      },
    );
  }, [draft, autocopy, showToast]);

  async function copy(kind: "email" | "linkedin" | "subject") {
    if (!draft) return;
    const text =
      kind === "email"
        ? formatEmail(draft)
        : kind === "linkedin"
          ? draft.linkedin_message
          : draft.subject;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setCopySucceeded(true);
      showToast("Copied");
      window.setTimeout(() => {
        setCopied((prev) => (prev === kind ? null : prev));
      }, 1200);
    } catch {
      showToast("Copy failed");
    }
  }

  if (status === "loading") {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted">Loading…</span>
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
            That draft isn’t here.
          </p>
          <Button variant="secondary" size="md" onClick={() => router.replace("/drafts")}>
            Back to drafts
          </Button>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  const name = person?.name ?? "them";
  const approvedTime = draft.approved_at
    ? new Date(draft.approved_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-6 px-5 pt-2">
        <div className="pt-1">
          <button
            type="button"
            onClick={() => router.push("/drafts")}
            className="text-[15px] font-medium text-ink"
          >
            ‹ Follow-ups
          </button>
        </div>

        <ReadyGlyph />

        <div className="flex flex-col gap-5">
          <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.4px] text-ink">
            Ready to send to {name}.
          </h1>
          <p className="text-[15px] leading-[1.45] text-muted">
            {copySucceeded ? "Copied to your clipboard. Paste it into your email or LinkedIn." : "Copy your approved message below, then paste it into your email or LinkedIn."}
          </p>
        </div>

        {/* Subject card */}
        <div className="flex flex-col gap-[6px] rounded-[12px] border border-line bg-card p-4">
          <SectionLabel>Subject</SectionLabel>
          <p className="text-[15px] font-medium text-ink">{draft.subject}</p>
          <p className="text-[13px] text-muted">
            {approvedTime
              ? `Approved ${approvedTime} · Email and LinkedIn`
              : "Email and LinkedIn"}
          </p>
          <div className="mt-2 flex gap-2">
            <CopyButton
              label="Copy email"
              active={copied === "email"}
              onClick={() => void copy("email")}
            />
            <CopyButton
              label="Copy LinkedIn"
              active={copied === "linkedin"}
              onClick={() => void copy("linkedin")}
            />
          </div>
          {/* Opens a prefilled compose window; the user adds the recipient and sends. Kairos never sends. */}
          <div className="mt-1 flex gap-2">
            <a
              href={gmailComposeUrl(draft)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-2 text-[13px] font-medium text-white"
            >
              Open in Gmail
            </a>
            <a
              href={mailtoUrl(draft)}
              className="inline-flex items-center justify-center rounded-full border border-line bg-card px-3 py-2 text-[13px] font-medium text-ink"
            >
              Mail app
            </a>
          </div>
        </div>

        <p className="text-[12px] text-faint">
          Editing it again moves it back to draft.
        </p>

        <div className="mt-auto flex flex-col gap-3 pb-6">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() =>
              router.push(`/drafts/new/type?person=${encodeURIComponent(draft.person_id)}`)
            }
          >
            New draft
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/today")}
            trailing={<span aria-hidden>→</span>}
          >
            Back to Today
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function CopyButton({
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors " +
        (active
          ? "border-ink bg-ink text-white"
          : "border-line bg-card text-ink hover:bg-subtle")
      }
      aria-live="polite"
    >
      <span aria-hidden>{active ? "✓" : "⧉"}</span>
      <span>{active ? "Copied" : label}</span>
    </button>
  );
}

function ReadyGlyph() {
  return (
    <div
      aria-hidden
      className="flex h-[72px] w-[72px] items-center justify-center rounded-[16px] border border-line bg-card"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-9 w-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 10l12 8 12-8" className="text-faint" />
        <rect
          x="4"
          y="8"
          width="24"
          height="18"
          rx="2"
          className="text-ink"
        />
        <path
          d="M16 4v10m0 0l-3-3m3 3l3-3"
          className="text-alert"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

// Gmail's documented compose link: opens Gmail (web, or the app on phones that hand it over) with the
// subject and body filled in and the To field empty, since Kairos does not know people's addresses.
function gmailComposeUrl(draft: Draft): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", su: draft.subject.trim(), body: draft.body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

// Fallback for any mail app (Apple Mail, Outlook, the Gmail app as default handler).
function mailtoUrl(draft: Draft): string {
  return `mailto:?subject=${encodeURIComponent(draft.subject.trim())}&body=${encodeURIComponent(draft.body)}`;
}

function formatEmail(draft: Draft): string {
  const subject = draft.subject.trim();
  return subject ? `Subject: ${subject}\n\n${draft.body}` : draft.body;
}

function DraftReadyRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <RequireProfile>
      <Ready draftId={id} />
    </RequireProfile>
  );
}

export default function DraftReadyPage() {
  return (
    <Suspense fallback={null}>
      <DraftReadyRoute />
    </Suspense>
  );
}
