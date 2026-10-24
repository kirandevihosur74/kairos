"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Avatar, Button, Card, Chip, PhoneShell, SectionLabel } from "@/components";
import { api } from "@/lib/api";
import {
  clearStoredDraft,
  describeError,
  readStoredDraft,
  toProfileInput,
  type Draft,
} from "../draft";

function CheckBadge() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block h-[14px] w-[14px] text-[#0f7b3f]"
      aria-hidden
    >
      <path d="M2.5 7.5l3 3 6-6.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-muted"
      aria-hidden
    >
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}

function CompanyBadge({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-cream text-[11px] font-semibold text-ink"
    >
      {label}
    </span>
  );
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 text-muted"
      aria-hidden
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  );
}

export default function OnboardingNetworkPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft] = useState<Draft>(() => readStoredDraft());
  const [imported, setImported] = useState<null | {
    name: string;
    count: number;
  }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock the upload — do NOT POST anywhere.
      // Backend TODO: POST /onboarding/connections (CSV → CONNECTED_TO edges).
      setImported({ name: file.name || "Connections.csv", count: 1284 });
    }
    e.target.value = "";
  };

  const finishOnboarding = async (): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      await api.saveOnboarding(toProfileInput(draft));
      clearStoredDraft();
      return true;
    } catch (err) {
      setError(describeError(err, "Could not save your profile."));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = async () => {
    const ok = await finishOnboarding();
    if (ok) router.push("/event");
  };

  const onSkip = async () => {
    const ok = await finishOnboarding();
    if (ok) router.push("/event");
  };

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-6 px-5 pb-10 pt-2">
        <div className="flex items-start justify-between gap-3 pt-1">
          <Link
            href="/onboarding/goal"
            aria-label="Back"
            className="text-[22px] leading-none text-ink"
          >
            ‹
          </Link>
          <Chip tone="outline" className="mt-0.5 text-[12px]">
            Step 3 of 3
          </Chip>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
            Bring your network.
          </h1>
          <p className="text-[15px] leading-[1.45] text-muted">
            Your LinkedIn connections unlock warm intros: who can introduce you
            to whom.
          </p>
        </div>

        <Card tone="plain" radius="md" padded className="flex flex-col gap-3">
          <SectionLabel>Get your export · 2 min</SectionLabel>
          <ol className="flex flex-col gap-2">
            <li className="flex items-start gap-3">
              <span className="font-serif text-[18px] leading-none text-ink">
                1
              </span>
              <p className="text-[14px] leading-[1.45] text-ink">
                Open LinkedIn · Settings · Data privacy.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-serif text-[18px] leading-none text-ink">
                2
              </span>
              <p className="text-[14px] leading-[1.45] text-ink">
                Request a data archive and choose Connections only.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-serif text-[18px] leading-none text-ink">
                3
              </span>
              <p className="text-[14px] leading-[1.45] text-ink">
                Upload the Connections.csv when it arrives.
              </p>
            </li>
          </ol>
        </Card>

        {imported ? (
          <Card tone="suggest" radius="md" padded className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <FileIcon />
              <p className="flex-1 text-[14px] text-ink">
                {imported.name} · {imported.count.toLocaleString()} imported{" "}
                <CheckBadge />
              </p>
            </div>
            <p className="text-[12px] text-muted">
              Names, companies and titles only
            </p>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-[12px] border border-dashed border-line bg-card px-4 py-3 text-left hover:border-ink"
          >
            <span className="block text-[15px] font-medium text-ink">
              Upload Connections.csv
            </span>
            <span className="block text-[13px] text-muted">
              Names, companies and titles only
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileChange}
        />

        <Card tone="attention" radius="md" padded className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-ink">
            Private to you · stays in your graph
          </p>
          <p className="text-[13px] leading-[1.45] text-ink">
            We never message your connections or scrape their profiles. Remove
            it anytime in Your data.
          </p>
        </Card>

        <div className="flex flex-col gap-3">
          <SectionLabel>What it unlocks</SectionLabel>
          <Card tone="plain" radius="md" padded className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-muted">You</span>
              <Arrow />
              <Avatar name="Jamie Chen" size="md" />
              <Arrow />
              <CompanyBadge label="EB" />
              <Arrow />
              <Avatar name="Priya Patel" size="md" />
            </div>
            <p className="text-[12px] text-muted">
              Jamie worked at Everbright with Priya · warm intro ready
            </p>
          </Card>
        </div>

        {error ? (
          <div className="rounded-[12px] border border-alert/40 bg-alert/5 px-3 py-2 text-[13px] text-alert">
            {error}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => void onSkip()}
            disabled={submitting}
          >
            Skip for now
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => void onContinue()}
            disabled={submitting}
            trailing={<span aria-hidden>→</span>}
          >
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}
