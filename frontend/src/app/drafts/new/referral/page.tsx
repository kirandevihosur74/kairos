"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Button,
  Chip,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
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

function Referral() {
  const router = useRouter();
  const search = useSearchParams();
  const personId = search.get("person");
  const { conferenceId } = useSession();

  const [person, setPerson] = useState<PersonCard | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);

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

  const latestNoteTime = useMemo(() => {
    if (!person?.met) return null;
    try {
      return new Date(person.met.created_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [person]);

  const canSubmit =
    Boolean(personId && conferenceId) &&
    jobUrl.trim().length > 0 &&
    jobDescription.trim().length > 0;

  async function onSubmit() {
    if (!personId || !conferenceId) {
      setSubmitError("Missing person or event.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const draft = await api.draftFollowup(
        personId,
        conferenceId,
        "referral",
        jobUrl.trim(),
        jobDescription.trim(),
      );
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
            ‹ Draft type
          </button>
        </div>

        {!personId ? (
          <MissingPerson onBrowse={() => router.push("/discover")} />
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col gap-3">
              <h1 className="font-serif text-[34px] leading-none text-ink">
                Which role?
              </h1>
              <p className="text-[15px] leading-[1.45] text-muted">
                Kairos asks conditionally and never claims{" "}
                {person?.name ?? "they"} can refer you.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>JOB LINK</SectionLabel>
              <input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                type="url"
                placeholder="https://jobs.example.com/backend-eng"
                className="h-12 rounded-[12px] border border-line bg-card px-4 text-[14px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>JOB DESCRIPTION</SectionLabel>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the role summary and what matters most."
                className="min-h-[170px] rounded-[12px] border border-line bg-card px-4 py-3 text-[14px] leading-[1.45] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>GROUNDED IN</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip tone="neutral" className="!text-[13px]">
                  {latestNoteTime
                    ? `Your note ${latestNoteTime}`
                    : "Your latest note"}
                </Chip>
                <Chip tone="neutral" className="!text-[13px]">
                  Your background
                </Chip>
                <Chip tone="neutral" className="!text-[13px]">
                  This job post
                </Chip>
              </div>
            </div>

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
            onClick={() => void onSubmit()}
            disabled={submitting || !canSubmit}
            trailing={<span aria-hidden>→</span>}
          >
            {submitting ? "Writing…" : "Write referral request"}
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
        Open someone from Discover, then draft from their card.
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

export default function ReferralPage() {
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
        <Referral />
      </Suspense>
    </RequireProfile>
  );
}
