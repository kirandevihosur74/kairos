"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Button,
  Card,
  Chip,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type ConferenceSummary } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function EventsPage() {
  return (
    <RequireProfile>
      <EventsView />
    </RequireProfile>
  );
}

function EventsView() {
  const router = useRouter();
  const { conferenceId, setConferenceId, setCurrentPersonId } = useSession();
  const [events, setEvents] = useState<ConferenceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.listConferences().then(
      (list) => {
        // Only events that loaded; a failed fetch has no people to show.
        if (!cancelled) setEvents(list.filter((e) => e.stage === "ready"));
      },
      (err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && typeof err.detail === "string" ? err.detail : "Could not load your events.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function open(event: ConferenceSummary) {
    setConferenceId(event.conference_id);
    setCurrentPersonId(null);
    router.push("/today");
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-10 pt-4">
        <header className="flex flex-col gap-2 px-2">
          <SectionLabel>Your events</SectionLabel>
          <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-ink">
            Pick a room.
          </h1>
          <p className="text-sm text-muted">
            Every event you added, with who you shortlisted, met and still owe a follow-up.
          </p>
        </header>

        {error ? (
          <Card radius="lg" padded>
            <p className="text-sm text-alert">{error}</p>
          </Card>
        ) : events === null ? (
          <Card radius="lg" padded>
            <p className="text-sm text-muted">Loading your events…</p>
          </Card>
        ) : events.length === 0 ? (
          <Card radius="lg" padded>
            <p className="text-sm text-muted">No events yet. Add the first one below.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => {
              const current = event.conference_id === conferenceId;
              return (
                <button
                  key={event.conference_id}
                  type="button"
                  onClick={() => open(event)}
                  className={
                    "flex w-full flex-col gap-2 rounded-[16px] border bg-card px-4 py-3 text-left " +
                    (current ? "border-ink" : "border-line hover:bg-subtle/50")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-serif text-[20px] leading-tight text-ink">{event.name ?? event.url}</p>
                    {current ? <Chip tone="on">Current</Chip> : null}
                  </div>
                  <p className="truncate text-[12px] text-faint">
                    {[formatDate(event.start_at), hostOf(event.url)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[13px] text-muted">
                    {event.people_found} people · {event.counts.interesting} shortlisted · {event.counts.met} met
                    {event.counts.drafts_pending ? ` · ${event.counts.drafts_pending} drafts to review` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <Button variant="secondary" size="lg" fullWidth onClick={() => router.push("/event")}>
          Add another event
        </Button>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
