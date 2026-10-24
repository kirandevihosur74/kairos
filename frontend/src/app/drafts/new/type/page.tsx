"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AppNav,
  Button,
  PhoneShell,
  RequireProfile,
} from "@/components";
import {
  ApiError,
  api,
  type DraftKind,
  type PersonCard,
} from "@/lib/api";
import { useSession } from "@/lib/session";

const QUEUE_STORAGE_KEY = "kairos.drafts";

function pushToQueue(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const existing = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
    if (existing.includes(id)) return;
    existing.push(id);
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore quota errors.
  }
}

interface Option {
  kind: DraftKind;
  title: string;
  description: string;
  ctaLabel: string;
}

const OPTIONS: Option[] = [
  {
    kind: "follow_up",
    title: "Follow-up",
    description: "After you met. Uses your notes.",
    ctaLabel: "follow-up",
  },
  {
    kind: "introduction",
    title: "Introduction",
    description: "Before you meet. Doesn’t imply a prior conversation.",
    ctaLabel: "introduction",
  },
  {
    kind: "referral",
    title: "Referral request",
    description: "Needs a note plus the job link and description.",
    ctaLabel: "referral request",
  },
];

function ChooseDraftType() {
  const router = useRouter();
  const search = useSearchParams();
  const personId = search.get("person");
  const initialKind = (search.get("kind") as DraftKind | null) ?? "follow_up";
  const { conferenceId } = useSession();

  const [person, setPerson] = useState<PersonCard | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);

  const [kind, setKind] = useState<DraftKind>(initialKind);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (conferenceId === null) {
      router.replace("/event");
    }
  }, [conferenceId, router]);

  useEffect(() => {
    if (!conferenceId || !personId) return;
    let cancelled = false;
    api.getPerson(personId, conferenceId).then(
      (p) => {
        if (!cancelled) setPerson(p);
      },
      (err) => {
        if (cancelled) return;
        setPersonError(
          err instanceof ApiError
            ? describeError(err)
            : "Could not load person.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [personId, conferenceId]);

  const activeOption = OPTIONS.find((o) => o.kind === kind) ?? OPTIONS[0];

  async function onPrimary() {
    if (!personId || !conferenceId) {
      setSubmitError("Missing person or event. Head back to Discover.");
      return;
    }
    if (kind === "referral") {
      router.push(
        `/drafts/new/referral?person=${encodeURIComponent(personId)}`,
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const draft = await api.draftFollowup(personId, conferenceId, kind);
      pushToQueue(draft.id);
      router.replace(`/drafts/${draft.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? describeError(err)
          : "Could not create that draft.",
      );
      setSubmitting(false);
    }
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col px-5 pt-2">
        <div className="pb-4 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[15px] font-medium text-ink"
          >
            ‹ {person?.name ?? "Back"}
          </button>
        </div>

        {!personId ? (
          <MissingPerson onBrowse={() => router.push("/discover")} />
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
              What do you want to send?
            </h1>

            <div className="flex flex-col gap-3">
              {OPTIONS.map((opt) => {
                const selected = opt.kind === kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setKind(opt.kind)}
                    className={
                      "flex items-start gap-3 rounded-[12px] px-4 py-4 text-left transition-colors " +
                      (selected
                        ? "border-2 border-[#F7D84A] bg-cream"
                        : "border border-line bg-card")
                    }
                    aria-pressed={selected}
                  >
                    <span
                      className={
                        "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border " +
                        (selected
                          ? "border-ink bg-ink"
                          : "border-faint bg-card")
                      }
                      aria-hidden
                    >
                      {selected ? (
                        <span className="h-[6px] w-[6px] rounded-full bg-white" />
                      ) : null}
                    </span>
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-[16px] font-semibold text-ink">
                        {opt.title}
                      </span>
                      <span className="text-[13px] leading-[1.45] text-muted">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[13px] leading-[1.45] text-muted">
              Drafts use your confirmed background and latest note. Kairos
              never sends; you approve and copy.
            </p>

            {personError ? (
              <p className="text-[13px] text-alert">{personError}</p>
            ) : null}
          </div>
        )}

        {submitError ? (
          <p className="pt-3 text-[13px] text-alert">{submitError}</p>
        ) : null}

        <div className="mt-auto pb-6 pt-6">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => void onPrimary()}
            disabled={submitting || !personId || !conferenceId}
            trailing={<span aria-hidden>→</span>}
          >
            {submitting ? "Writing…" : `Write ${activeOption.ctaLabel}`}
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function MissingPerson({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="font-serif text-[28px] leading-tight text-ink">
        Pick who you’re writing to.
      </p>
      <p className="max-w-[280px] text-[14px] text-muted">
        Open someone from Discover, then draft from their card. Drafts need
        context.
      </p>
      <Button variant="secondary" size="md" onClick={onBrowse}>
        Go to Discover
      </Button>
    </div>
  );
}

function describeError(err: ApiError): string {
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail) && err.detail.length) return err.detail[0].msg;
  return `Request failed (${err.status})`;
}

export default function ChooseDraftTypePage() {
  return (
    <RequireProfile>
      <Suspense
        fallback={
          <PhoneShell>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-muted">Loading…</span>
            </div>
            <AppNav />
          </PhoneShell>
        }
      >
        <ChooseDraftType />
      </Suspense>
    </RequireProfile>
  );
}
