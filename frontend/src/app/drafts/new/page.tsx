"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AppNav,
  Button,
  Chip,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import {
  ApiError,
  api,
  type DraftKind,
  type PersonCard,
} from "@/lib/api";
import { useSession } from "@/lib/session";

type Step = "choose" | "referral";

interface Option {
  kind: DraftKind;
  title: string;
  description: string;
  cta: string;
}

const OPTIONS: Option[] = [
  {
    kind: "follow_up",
    title: "Follow-up",
    description: "After you met. Uses your notes.",
    cta: "Write follow-up",
  },
  {
    kind: "introduction",
    title: "Introduction",
    description: "Before you meet. Doesn’t imply a prior conversation.",
    cta: "Write introduction",
  },
  {
    kind: "referral",
    title: "Referral request",
    description: "Needs a note plus the job link and description.",
    cta: "Continue to referral details",
  },
];

function NewDraft() {
  const router = useRouter();
  const search = useSearchParams();
  const personId = search.get("person");
  const { conferenceId } = useSession();

  const [person, setPerson] = useState<PersonCard | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);

  const [kind, setKind] = useState<DraftKind>("follow_up");
  const [step, setStep] = useState<Step>("choose");

  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");

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
          err instanceof ApiError ? describeError(err) : "Could not load person.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [personId, conferenceId]);

  const activeOption = OPTIONS.find((o) => o.kind === kind) ?? OPTIONS[0];

  const canContinue = Boolean(personId && conferenceId);
  const canSubmitReferral =
    jobUrl.trim().length > 0 && jobDescription.trim().length > 0;

  async function onSubmit() {
    if (!personId || !conferenceId) {
      setSubmitError("Missing person or event. Head back to Discover.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const draft = await api.draftFollowup(
        personId,
        conferenceId,
        kind,
        kind === "referral" ? jobUrl.trim() : undefined,
        kind === "referral" ? jobDescription.trim() : undefined,
      );
      router.replace(`/drafts/${draft.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? describeError(err) : "Could not create that draft.",
      );
      setSubmitting(false);
    }
  }

  function onPrimary() {
    if (step === "choose" && kind === "referral") {
      setStep("referral");
      return;
    }
    void onSubmit();
  }

  const headerBack =
    step === "referral" ? (
      <button
        type="button"
        onClick={() => setStep("choose")}
        className="text-[15px] font-medium text-ink"
      >
        ‹ Draft type
      </button>
    ) : (
      <button
        type="button"
        onClick={() => router.back()}
        className="text-[15px] font-medium text-ink"
      >
        ‹ {person?.name ?? "Back"}
      </button>
    );

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col px-5 pt-2">
        <div className="pb-4 pt-1">{headerBack}</div>

        {!personId ? (
          <MissingPerson onBrowse={() => router.push("/discover")} />
        ) : step === "choose" ? (
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
                      "flex items-start gap-3 rounded-[12px] border px-4 py-4 text-left transition-colors " +
                      (selected
                        ? "border-ink bg-cream"
                        : "border-line bg-card")
                    }
                  >
                    <span
                      className={
                        "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border " +
                        (selected ? "border-ink bg-ink" : "border-faint bg-card")
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
              Drafts use your confirmed background and latest note. Kairos never
              sends; you approve and copy.
            </p>

            {personError ? (
              <p className="text-[13px] text-alert">{personError}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col gap-3">
              <h1 className="font-serif text-[34px] leading-none text-ink">
                Which role?
              </h1>
              <p className="text-[15px] leading-[1.45] text-muted">
                Kairos asks conditionally and never claims {person?.name ?? "they"} can
                refer you.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Job link</SectionLabel>
              <input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                type="url"
                placeholder="https://jobs.example.com/backend-eng"
                className="h-12 rounded-[12px] border border-line bg-card px-4 text-[14px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Job description</SectionLabel>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the role summary and what matters most."
                className="min-h-[170px] rounded-[12px] border border-line bg-card px-4 py-3 text-[14px] leading-[1.45] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Grounded in</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip tone="outline">Your latest note</Chip>
                <Chip tone="outline">Your background</Chip>
                <Chip tone="outline">This job post</Chip>
              </div>
            </div>
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
            onClick={onPrimary}
            disabled={
              submitting ||
              !canContinue ||
              (step === "referral" && !canSubmitReferral)
            }
            trailing={<span aria-hidden>→</span>}
          >
            {submitting ? "Writing…" : activeOption.cta}
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

export default function NewDraftPage() {
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
        <NewDraft />
      </Suspense>
    </RequireProfile>
  );
}
