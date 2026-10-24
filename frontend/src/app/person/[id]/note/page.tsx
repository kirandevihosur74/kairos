"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  PhoneShell,
  RequireProfile,
  SectionLabel,
  useToast,
  VoiceRecorder,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

function NoteCaptureRoute() {
  const params = useParams<{ id: string }>();
  // Route params arrive URL-encoded ("conference_x%3Aperson"); decode so the id is not encoded twice
  // when it is stored for the mic button and put back into a URL.
  const id = params?.id ? decodeURIComponent(params.id) : undefined;
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
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    };
  }, [id, conferenceId, router]);

  async function handleSave() {
    if (!conferenceId || !person || !text.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveMetNote(conferenceId, person.id, text.trim());
      showToast(`Note saved to ${firstName(person.name)}'s memory`);
      router.replace(`/person/${encodeURIComponent(person.id)}`);
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError && typeof err.detail === "string"
          ? err.detail
          : "Could not save the note. Try again.",
      );
    }
  }

  if (conferenceId === null) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Redirecting…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  if (status === "loading") {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Loading…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  if (status === "error" || !person) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 px-8 text-center">
          <p className="text-sm text-alert">Could not load this person.</p>
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  const canSave = text.trim().length > 0 && !saving;
  const subtitle = [person.title, person.company].filter(Boolean).join(" · ");

  return (
    <PhoneShell>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-4"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[14px] text-alert hover:underline"
            aria-label="Cancel"
          >
            ‹ Back
          </button>
          <span className="font-serif text-[18px] tracking-[-0.01em] text-ink">
            kairos
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar name={person.name} src={person.photo_url} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[16px] text-ink">
              What did you learn about {firstName(person.name)}?
            </p>
            {subtitle ? (
              <p className="text-[12px] text-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Note</SectionLabel>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="They mentioned flaky tests cost about a day every sprint. Wants a demo next week."
            rows={8}
            autoFocus
            className="w-full resize-none rounded-[12px] border border-line bg-card px-4 py-3 text-[15px] leading-[1.5] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />
          <p className="text-[12px] text-muted">
            Notes are append-only and saved to {firstName(person.name)}&rsquo;s memory in your graph.
          </p>
          {/* Dictation fills the box for review; nothing is saved until "Save note". */}
          <VoiceRecorder
            conferenceId={conferenceId}
            personId={person.id}
            disabled={saving}
            onTranscript={(spoken) =>
              setText((current) => (current.trim() ? `${current.trim()}\n${spoken}` : spoken))
            }
          />
        </div>

        {error ? <p className="text-[13px] text-alert">{error}</p> : null}

        {/* Sticky above the floating bottom nav. */}
        <div className="sticky bottom-[92px] z-20 mt-auto flex flex-col gap-3 bg-paper/95 pb-2 pt-3 backdrop-blur">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save note"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
      <AppNav />
    </PhoneShell>
  );
}
