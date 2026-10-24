"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Avatar, Button, Card, PhoneShell } from "@/components";
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
      className="h-4 w-4 text-muted"
      aria-hidden
    >
      <path d="M6.5 9.5a2.5 2.5 0 0 0 3.54 0l2.12-2.12a2.5 2.5 0 1 0-3.54-3.54L7.5 4.96" />
      <path d="M9.5 6.5a2.5 2.5 0 0 0-3.54 0L3.84 8.62a2.5 2.5 0 1 0 3.54 3.54l1.12-1.12" />
    </svg>
  );
}

function ArrowSendIcon() {
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

function PinIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-ink"
      aria-hidden
    >
      <path d="M10 2.5c-3 0-5.5 2.3-5.5 5.3 0 3.9 5.5 9.7 5.5 9.7s5.5-5.8 5.5-9.7c0-3-2.5-5.3-5.5-5.3z" />
      <circle cx="10" cy="7.8" r="1.8" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-ink"
      aria-hidden
    >
      <path d="M3 9l4-4" />
      <path d="M2 10l2-2 2 2-2 2z" />
      <path d="M7 5l3-3 2 2-3 3z" />
      <path d="M2 13h8" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-ink"
      aria-hidden
    >
      <rect x="5" y="2" width="4" height="7" rx="2" />
      <path d="M3.5 7a3.5 3.5 0 0 0 7 0" />
      <path d="M7 10.5v2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-ink"
      aria-hidden
    >
      <path d="M7 1.5l1.6 3.3 3.6.5-2.6 2.6.6 3.6L7 9.7l-3.2 1.8.6-3.6L1.8 5.3l3.6-.5z" />
    </svg>
  );
}

function CheckC() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] text-[#0f7b3f]"
      aria-hidden
    >
      <circle cx="9" cy="9" r="7.5" />
      <path d="M5.5 9.2l2.5 2.5L12.5 7" />
    </svg>
  );
}

function Loader() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="h-[18px] w-[18px] animate-spin text-alert"
      aria-hidden
    >
      <path d="M9 1.5a7.5 7.5 0 1 0 7.5 7.5" />
    </svg>
  );
}

function HollowCircle() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-[18px] w-[18px] text-line"
      aria-hidden
    >
      <circle cx="9" cy="9" r="7.5" />
    </svg>
  );
}

interface PreviewData {
  title: string;
  subtitle: string;
  categories: { label: string; icon?: "gavel" | "mic" | "star" }[];
  progress: number;
  found: number;
  sources: {
    label: string;
    detail: string;
    state: "done" | "loading" | "queued";
  }[];
  attendeeNames: string[];
}

const MOCK_PREVIEW: PreviewData = {
  title: "Patch the Conference",
  subtitle: "Bright Data SF · Today, 9 AM to 7 PM",
  categories: [
    { label: "Judges", icon: "gavel" },
    { label: "Speakers", icon: "mic" },
    { label: "Sponsors", icon: "star" },
  ],
  progress: 0.62,
  found: 31,
  sources: [
    { label: "Judges and speakers", detail: "31 people", state: "done" },
    { label: "Sponsors", detail: "6 companies", state: "done" },
    { label: "LinkedIn profiles", detail: "34 of 48", state: "loading" },
    { label: "Rank against your goal", detail: "Next", state: "queued" },
  ],
  attendeeNames: ["Maya Chen", "Jordan Rivera", "Priya Patel", "Alex Kim"],
};

export default function AddEventPage() {
  const router = useRouter();
  const { setConferenceId } = useSession();
  const [url, setUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => MOCK_PREVIEW, []);
  const canSubmit = url.trim().length > 0 && !submitting;

  const maybeShowPreview = () => {
    if (url.trim().length > 0) setShowPreview(true);
  };

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const conference = await api.createConference(
        url.trim(),
        preview.title || undefined,
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
        className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-3"
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
          <div className="flex flex-1 items-center gap-2.5 rounded-[12px] border border-line bg-card px-3.5 py-3 focus-within:border-ink">
            <LinkIcon />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={maybeShowPreview}
              onPaste={() => setTimeout(maybeShowPreview, 0)}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="wemakedevs.org/hackathons/ptc"
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-[1.45] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={maybeShowPreview}
            disabled={!url.trim().length}
            aria-label="Preview event"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-ink text-white disabled:opacity-50"
          >
            <ArrowSendIcon />
          </button>
        </div>

        {showPreview ? (
          <>
            <Card tone="attention" radius="md" padded className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <PinIcon />
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-[16px] font-medium text-ink">
                    {preview.title}
                  </p>
                  <p className="text-[12px] text-ink/70">{preview.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.categories.map((cat) => (
                  <span
                    key={cat.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[12px] font-medium text-ink"
                  >
                    {cat.icon === "gavel" ? <GavelIcon /> : null}
                    {cat.icon === "mic" ? <MicIcon /> : null}
                    {cat.icon === "star" ? <StarIcon /> : null}
                    {cat.label}
                  </span>
                ))}
              </div>
            </Card>

            <Card tone="plain" radius="md" padded className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-serif text-[22px] leading-none tracking-[-0.01em] text-ink">
                  Building your graph
                </p>
                <p className="text-[13px] text-alert">
                  {Math.round(preview.progress * 100)}%
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-spectrum"
                  style={{ width: `${preview.progress * 100}%` }}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {preview.sources.map((src) => (
                  <div
                    key={src.label}
                    className="flex items-center gap-2.5"
                  >
                    {src.state === "done" ? <CheckC /> : null}
                    {src.state === "loading" ? <Loader /> : null}
                    {src.state === "queued" ? <HollowCircle /> : null}
                    <p
                      className={
                        "flex-1 text-[14px] " +
                        (src.state === "queued"
                          ? "text-muted"
                          : "font-medium text-ink")
                      }
                    >
                      {src.label}
                    </p>
                    <p className="text-[12px] text-muted">{src.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2.5">
                {preview.attendeeNames.map((n) => (
                  <span
                    key={n}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-paper"
                  >
                    <Avatar name={n} size="md" />
                  </span>
                ))}
              </div>
              <p className="text-[13px] font-medium text-muted">
                {preview.found} found so far
              </p>
            </div>
          </>
        ) : null}

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
