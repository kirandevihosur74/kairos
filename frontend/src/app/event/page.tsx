"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, PhoneShell } from "@/components";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { describeError } from "../onboarding/draft";

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-ink"
      aria-hidden
    >
      <path d="M6.5 9.5a2.5 2.5 0 0 0 3.54 0l2.12-2.12a2.5 2.5 0 1 0-3.54-3.54L7.5 4.96" />
      <path d="M9.5 6.5a2.5 2.5 0 0 0-3.54 0L3.84 8.62a2.5 2.5 0 1 0 3.54 3.54l1.12-1.12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-white"
      aria-hidden
    >
      <path d="M3 9h12" />
      <path d="M10 4l5 5-5 5" />
    </svg>
  );
}

export default function AddEventPage() {
  const router = useRouter();
  const { setConferenceId } = useSession();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = url.trim().length > 0 && !submitting;

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const conference = await api.createConference(
        url.trim(),
        name.trim() || undefined,
      );
      setConferenceId(conference.id);
      router.push("/discover");
    } catch (err) {
      setError(describeError(err, "Could not add that event."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PhoneShell withNavSpacer={false}>
      <form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col gap-6 px-5 pb-10 pt-3"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-[18px] w-[18px] rounded-full border-[1.5px] border-ink"
          />
          <p className="font-serif text-[23px] leading-none tracking-[-0.01em] text-ink">
            kairos
          </p>
        </div>

        <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.01em] text-ink">
          Where are you going next?
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2.5 rounded-[10px] border-[1.5px] border-ink bg-card px-3.5 py-3">
            <LinkIcon />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="wemakedevs.org/hackathons/ptc"
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-[1.45] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Add event"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-50"
          >
            <ArrowIcon />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
            Name · optional
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patch the Conference"
            className="rounded-[12px] border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />
          <p className="text-[12px] text-faint">
            We fetch the event page, then build your graph from it. You can edit
            everything later.
          </p>
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
            type="submit"
            disabled={!canSubmit}
            trailing={<span aria-hidden>→</span>}
          >
            {submitting ? "Adding…" : "Start sorting"}
          </Button>
        </div>
      </form>
    </PhoneShell>
  );
}
