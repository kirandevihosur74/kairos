"use client";

import Image from "next/image";
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
import { useSession } from "@/lib/session";

function Ready({ draftId }: { draftId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { conferenceId } = useSession();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [autocopy, setAutocopy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getDraft(draftId).then(
      async (d) => {
        if (cancelled) return;
        setDraft(d);
        try {
          const cid = conferenceId ?? d.conference_id;
          const p = await api.getPerson(d.person_id, cid);
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
  }, [draftId, conferenceId]);

  // Autocopy the email body on arrival once per draft.
  useEffect(() => {
    if (!draft || autocopy) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const payload = draft.body;
    navigator.clipboard.writeText(payload).then(
      () => {
        setAutocopy(true);
        showToast("Copied");
      },
      () => {
        setAutocopy(true);
      },
    );
  }, [draft, autocopy, showToast]);

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

  const name = person?.name ?? "them";
  const approvedTime = draft.approved_at
    ? new Date(draft.approved_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const mailtoHref = (() => {
    const params = new URLSearchParams();
    if (draft.subject) params.set("subject", draft.subject);
    if (draft.body) params.set("body", draft.body);
    const qs = params.toString();
    return qs ? `mailto:?${qs}` : "mailto:";
  })();

  const linkedinHref = "https://linkedin.com/messaging";

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

        <div className="pt-2">
          <Image
            src="/emoji/follow-up.svg"
            alt=""
            width={72}
            height={72}
            aria-hidden
          />
        </div>

        <div className="flex flex-col gap-5">
          <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.4px] text-ink">
            Ready to send to {name}.
          </h1>
          <p className="text-[15px] leading-[1.45] text-muted">
            Copied to your clipboard. Kairos never sends for you.
          </p>
        </div>

        <div className="flex flex-col gap-[6px] rounded-[12px] border border-line bg-card p-4">
          <SectionLabel>SUBJECT</SectionLabel>
          <p className="text-[15px] font-medium text-ink">{draft.subject}</p>
          <p className="text-[13px] text-muted">
            {approvedTime
              ? `Approved ${approvedTime} · Email and LinkedIn`
              : "Email and LinkedIn"}
          </p>
        </div>

        <p className="text-[12px] text-faint">
          Editing it again moves it back to draft.
        </p>

        <div className="mt-auto flex flex-col gap-3 pb-6">
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-card border border-ink text-[15px] font-semibold text-ink hover:bg-subtle"
          >
            Open LinkedIn
          </a>
          <a
            href={mailtoHref}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-white hover:bg-ink/90"
          >
            Open in Gmail
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
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
