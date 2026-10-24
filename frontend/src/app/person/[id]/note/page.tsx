"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Chip,
  PhoneShell,
  RequireProfile,
  WaveformProgress,
  useToast,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

const UNDO_WINDOW_MS = 2600;

type TagKey = "follow_up" | "wants_demo" | "intro_needed" | "not_a_fit";

const TAGS: Array<{ key: TagKey; label: string }> = [
  { key: "follow_up", label: "Follow up" },
  { key: "wants_demo", label: "Wants a demo" },
  { key: "intro_needed", label: "Intro needed" },
  { key: "not_a_fit", label: "Not a fit" },
];

const DEFAULT_SELECTED: TagKey[] = ["follow_up", "wants_demo"];
const DEFAULT_TRANSCRIPT =
  "She said flaky tests cost them about a day every sprint. Wants to see monorepo caching next week, and loves sourdough.";

function NoteCaptureRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <RequireProfile>
      <NoteCaptureInner id={id} />
    </RequireProfile>
  );
}

export default function NoteCapturePage() {
  return (
    <Suspense fallback={null}>
      <NoteCaptureRoute />
    </Suspense>
  );
}

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "them";
  const [first] = trimmed.split(/\s+/);
  return first ?? trimmed;
}

function NoteCaptureInner({ id }: { id: string }) {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const { showToast } = useToast();
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  const [selectedTags, setSelectedTags] = useState<TagKey[]>(DEFAULT_SELECTED);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentPersonId(id);
  }, [id, setCurrentPersonId]);

  useEffect(() => {
    if (conferenceId === null) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    api.getPerson(id, conferenceId).then(
      (p) => {
        if (cancelled) return;
        setPerson(p);
        setStatus("ready");
      },
      () => {
        if (cancelled) return;
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [id, conferenceId, router]);

  function toggleTag(key: TagKey) {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function composeNoteBody(): string {
    const tagLabels = TAGS.filter((t) => selectedTags.includes(t.key)).map(
      (t) => t.label,
    );
    const tail = tagLabels.length ? `\n\nTags: ${tagLabels.join(", ")}` : "";
    return transcript.trim() + tail;
  }

  function handleDiscard() {
    router.back();
  }

  function handleSave() {
    if (!conferenceId || !person || saving) return;
    const body = composeNoteBody();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);

    // Fire the toast and route back to Today immediately so the user sees the
    // 3.4 composition. The actual POST /met is deferred by UNDO_WINDOW_MS so
    // "Undo" can cancel it before the server commit.
    let undone = false;
    const timer = window.setTimeout(() => {
      pendingTimerRef.current = null;
      if (undone) return;
      api.saveMetNote(conferenceId, person.id, body).catch((err: unknown) => {
        // Toast is already dismissed by the time this resolves; keep a
        // console breadcrumb for now. A follow-up PR should surface a retry
        // affordance.
        console.error("saveMetNote failed after undo window", err);
        if (err instanceof ApiError) {
          setError(
            typeof err.detail === "string"
              ? err.detail
              : "Note could not be saved.",
          );
        }
      });
    }, UNDO_WINDOW_MS);
    pendingTimerRef.current = timer;

    showToast(`Note saved to ${firstName(person.name)}'s memory`, {
      durationMs: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          if (pendingTimerRef.current !== null) {
            window.clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
          // Backend TODO: there is no DELETE /met today, so if the toast's
          // timer already fired before Undo is clicked, there is nothing to
          // reverse. The soft-undo window covers the common case.
        },
      },
    });

    router.replace("/today");
  }

  if (conferenceId === null || status === "loading") {
    return (
      <PhoneShell withNavSpacer={false}>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Loading…</span>
        </div>
      </PhoneShell>
    );
  }

  if (status === "error" || !person) {
    return (
      <PhoneShell withNavSpacer={false}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 px-8 text-center">
          <p className="text-sm text-alert">Could not load this person.</p>
          <button
            type="button"
            className="text-[13px] text-alert underline"
            onClick={() => router.back()}
          >
            Go back
          </button>
        </div>
      </PhoneShell>
    );
  }

  const name = firstName(person.name);
  const met = `Met ${formatNowHHMM()}${
    person.company ? ` · ${person.company}` : ""
  }`;

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="relative flex min-h-full flex-1 flex-col">
        {/* Dim backdrop over the whole screen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-ink/60"
        />
        {/* Spacer pushes sheet to the bottom. */}
        <div className="flex-1" />

        {/* Bottom sheet */}
        <div className="relative flex flex-col gap-[16px] rounded-tl-[16px] rounded-tr-[16px] bg-card px-5 pb-8 pt-[10px]">
          <span
            aria-hidden
            className="mx-auto h-[4px] w-[36px] rounded-[2px] bg-line"
          />

          {/* Header */}
          <div className="flex items-center gap-3">
            <Avatar
              name={person.name}
              src={person.photo_url}
              size="md"
              className="rounded-[12px]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="text-[16px] text-ink">
                What did you learn about {name}?
              </p>
              <p className="text-[12px] text-muted">{met}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => router.back()}
              className="h-5 w-5 shrink-0 text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Recording capsule */}
          <div className="flex w-full items-center gap-3 rounded-[12px] bg-subtle px-4 py-[14px]">
            <span
              aria-hidden
              className="inline-block h-[10px] w-[10px] shrink-0 rounded-full bg-alert"
            />
            <span className="text-[14px] text-ink">0:14</span>
            <WaveformProgress progress={0.55} className="flex-1" />
          </div>

          {/* Live transcript */}
          <div className="flex flex-col gap-[6px]">
            <p className="text-[11px] text-muted">Live transcript</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              className="w-full resize-none bg-transparent text-[15px] leading-[1.5] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          {/* Tag row */}
          <div className="flex flex-wrap gap-[8px]">
            {TAGS.map((t) => {
              const active = selectedTags.includes(t.key);
              return (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => toggleTag(t.key)}
                  aria-pressed={active}
                  className="rounded-full"
                >
                  <Chip
                    tone={active ? "selected" : "outline"}
                    leading={active ? <CheckIcon /> : undefined}
                    className={
                      active ? "border-ink" : "border-transparent bg-transparent"
                    }
                  >
                    {t.label}
                  </Chip>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-[10px]">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="flex flex-1 items-center justify-center rounded-full border border-ink bg-card px-[18px] py-[13px] text-[15px] text-alert disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !transcript.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-[18px] py-[13px] text-[15px] text-white disabled:opacity-50"
            >
              <Image
                src="/emoji/checkc.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden
              />
              Save note
            </button>
          </div>

          <p className="text-[12px] text-muted">
            Saved to {name}&rsquo;s memory in your graph.
          </p>

          {error ? <p className="text-[13px] text-alert">{error}</p> : null}
        </div>
      </div>
    </PhoneShell>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[14px] w-[14px] text-alert"
      aria-hidden
    >
      <path d="M3 7.5l2.8 2.8L11 4.5" />
    </svg>
  );
}

function formatNowHHMM(): string {
  const d = new Date();
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
