"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { Button, Chip, PhoneShell, SectionLabel } from "@/components";
import {
  dedupe,
  readStoredDraft,
  writeStoredDraft,
  type Draft,
} from "../draft";

type FieldKey = "target_roles" | "interests" | "location_preferences";

interface InlineChipGridProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}

function InlineChipGrid({ values, onChange, placeholder }: InlineChipGridProps) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const commit = () => {
    const parts = input
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) onChange(dedupe([...values, ...parts]));
    setInput("");
    setAdding(false);
  };

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {values.map((value) => (
        <Chip
          key={value}
          tone="on"
          className="cursor-pointer"
          onClick={() => remove(value)}
          role="button"
          aria-label={`Remove ${value}`}
        >
          {value} <span className="text-muted">✕</span>
        </Chip>
      ))}
      {adding ? (
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-[120px] rounded-full border border-dashed border-ink bg-transparent px-3 py-[7px] text-[13px] font-medium text-ink placeholder:text-faint focus:outline-none"
        />
      ) : (
        <Chip
          tone="suggest"
          className="cursor-pointer"
          onClick={() => setAdding(true)}
          role="button"
          aria-label="Add"
        >
          + Add
        </Chip>
      )}
    </div>
  );
}

export default function OnboardingGoalPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => readStoredDraft());

  const persist = (next: Draft) => {
    setDraft(next);
    writeStoredDraft(next);
  };

  const setField = (key: FieldKey, next: string[]) => {
    persist({ ...draft, [key]: next });
  };

  const canContinue =
    draft.target_roles.length > 0 || draft.interests.length > 0;

  const onContinue = () => {
    persist(draft);
    router.push("/onboarding/network");
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
          <Chip tone="outline" className="mt-0.5 text-[12px]">
            Step 2 of 3
          </Chip>
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
          <div className="flex flex-col gap-3">
            <SectionLabel>Target roles</SectionLabel>
            <InlineChipGrid
              values={draft.target_roles}
              onChange={(next) => setField("target_roles", next)}
              placeholder="e.g. Backend engineer"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Interests · used for ranking</SectionLabel>
            <InlineChipGrid
              values={draft.interests}
              onChange={(next) => setField("interests", next)}
              placeholder="e.g. distributed systems"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Location</SectionLabel>
            <InlineChipGrid
              values={draft.location_preferences}
              onChange={(next) => setField("location_preferences", next)}
              placeholder="e.g. San Francisco"
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

        <div className="mt-auto pt-6">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onContinue}
            disabled={!canContinue}
            trailing={<span aria-hidden>→</span>}
          >
            Continue
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}
