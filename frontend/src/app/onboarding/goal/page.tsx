"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PhoneShell } from "@/components";
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
    if (!canContinue || saving) return;
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
      <div className="flex flex-1 flex-col gap-4 px-5 pt-2">
        <header className="flex items-center justify-between">
          <Link href="/onboarding" aria-label="Back to resume import" className="flex h-9 w-9 items-center text-[24px]">‹</Link>
          <p className="text-[13px] text-muted">Step 2 of 3</p>
        </header>
        <div>
          <h1 className="font-serif text-[32px] leading-[1.1]">Who should you meet?</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">Pick the roles and interests that rank your matches.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">Name
          <input value={draft.name} maxLength={200} onChange={(e) => persist({ ...draft, name: e.target.value })} autoComplete="name" placeholder="Your name" className="rounded-xl border border-line bg-card px-3 py-2.5" />
        </label>
        <ChipField label="Target roles" values={draft.target_roles} onChange={(target_roles) => persist({ ...draft, target_roles })} placeholder="e.g. Backend engineer" />
        <ChipField label="Interests · used for ranking" values={draft.interests} onChange={(interests) => persist({ ...draft, interests })} placeholder="e.g. distributed systems" />
        <details className="rounded-xl border border-line bg-card px-3 py-3">
          <summary className="text-[13px] font-medium">More about you · optional</summary>
          <div className="mt-4 flex flex-col gap-4">
            <ChipField label="Skills" values={draft.skills} onChange={(skills) => persist({ ...draft, skills })} placeholder="e.g. Python, FastAPI" />
            <ChipField label="Location" values={draft.location_preferences} onChange={(location_preferences) => persist({ ...draft, location_preferences })} placeholder="e.g. San Francisco, Remote" />
            <label className="flex flex-col gap-2 text-[13px] font-medium">About you
              <textarea value={draft.background} onChange={(e) => persist({ ...draft, background: e.target.value })} rows={3} maxLength={5000} placeholder="What you build and where you want to go." className="rounded-xl border border-line px-3 py-2.5 font-normal" />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-medium">LinkedIn · reference only
              <input value={draft.linkedin_url} onChange={(e) => persist({ ...draft, linkedin_url: e.target.value })} placeholder="linkedin.com/in/you" className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal" />
            </label>
          </div>
        </details>
        {error && <p role="alert" className="text-[13px] text-alert">{error}</p>}
        <div className="app-actions mt-auto">
          <Button variant="primary" size="lg" fullWidth onClick={() => void onSubmit()} disabled={!canContinue || saving} trailing={<span aria-hidden>→</span>}>{saving ? "Saving…" : "Continue"}</Button>
        </div>
      </div>
    </PhoneShell>
  );
}
