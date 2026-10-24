"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PhoneShell, SectionLabel } from "@/components";
import { api } from "@/lib/api";
import { ChipField } from "../ChipField";
import {
  clearStoredDraft,
  describeError,
  readStoredDraft,
  toProfileInput,
  writeStoredDraft,
  type Draft,
} from "../draft";

export default function OnboardingGoalPage() {
  const router = useRouter();
  // Lazy init: on the client this reads sessionStorage before first paint;
  // on the server, readStoredDraft returns the empty draft.
  const [draft, setDraft] = useState<Draft>(() => readStoredDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = (next: Draft) => {
    setDraft(next);
    writeStoredDraft(next);
  };

  const canContinue =
    draft.name.trim().length > 0 &&
    draft.target_roles.length > 0 && draft.interests.length > 0;

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveOnboarding(toProfileInput(draft));
      clearStoredDraft();
      router.push("/event");
    } catch (err) {
      setError(describeError(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-6 px-5 pb-10 pt-2">
        <div className="flex items-start justify-between gap-3 pt-1">
          <Link
            href="/onboarding"
            aria-label="Back"
            className="text-[22px] leading-none text-ink"
          >
            ‹
          </Link>
          <p className="pt-1 text-[13px] text-muted">Step 2 of 3</p>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
            Who should you meet?
          </h1>
          <p className="text-[15px] leading-[1.45] text-muted">
            Kairos ranks people at the event by the interests you pick here.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-[13px] font-medium">Name
            <input value={draft.name} maxLength={200} onChange={(e) => persist({ ...draft, name: e.target.value })} autoComplete="name" placeholder="Your name" className="rounded-xl border border-line bg-card px-4 py-3 text-[15px]" />
          </label>
          <div className="flex flex-col gap-3">
            <SectionLabel>Target roles</SectionLabel>
            <ChipField
              label=""
              values={draft.target_roles}
              onChange={(target_roles) => persist({ ...draft, target_roles })}
              placeholder="e.g. Backend engineer"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Interests · used for ranking</SectionLabel>
            <ChipField
              label=""
              values={draft.interests}
              onChange={(interests) => persist({ ...draft, interests })}
              placeholder="e.g. distributed systems"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Location</SectionLabel>
            <ChipField
              label=""
              values={draft.location_preferences}
              onChange={(location_preferences) =>
                persist({ ...draft, location_preferences })
              }
              placeholder="e.g. San Francisco, Remote"
            />
          </div>

          <div className="flex flex-col gap-2">
            <SectionLabel>About you</SectionLabel>
            <textarea
              value={draft.background}
              onChange={(e) => persist({ ...draft, background: e.target.value })}
              rows={3}
              placeholder="I build backend APIs and want to work on infrastructure."
              className="rounded-[12px] border border-line bg-card px-4 py-3 text-[14px] leading-[1.4] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <SectionLabel>LinkedIn · optional</SectionLabel>
            <div className="flex items-center gap-2 rounded-[12px] border border-line bg-card px-4">
              <input
                value={draft.linkedin_url}
                onChange={(e) =>
                  persist({ ...draft, linkedin_url: e.target.value })
                }
                placeholder="linkedin.com/in/you"
                className="min-h-[48px] flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
              />
              <span className="text-[12px] text-muted">Reference only</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-[12px] border border-alert/40 bg-alert/5 px-3 py-2 text-[13px] text-alert">
            {error}
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => void onSubmit()}
            disabled={!canContinue || saving}
            trailing={<span aria-hidden>→</span>}
          >
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}
