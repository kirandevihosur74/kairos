"use client";

import { Logo } from "@/components/Logo";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav, Avatar, Button, PhoneShell, RequireProfile, SectionLabel } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type ConferenceSummary, type Profile } from "@/lib/api";
import { eventDate, eventPhase } from "@/lib/events";
import { useSession } from "@/lib/session";
import { describeError } from "../onboarding/draft";

function Events({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId, setConferenceId } = useSession();
  const [events, setEvents] = useState<ConferenceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let cancelled = false;
    api.listConferences().then((list) => { if (!cancelled) { setEvents(list); setError(null); } }, (err) => { if (!cancelled) setError(describeError(err, "Could not load your events.")); });
    return () => { cancelled = true; };
  }, [retry]);

  function open(event: ConferenceSummary) {
    setConferenceId(event.conference_id);
    router.push(eventPhase(event, now) === "past" ? "/recap" : "/today");
  }

  return <PhoneShell><div className="flex flex-1 flex-col gap-5 px-5 pt-1 pb-6">
    <header className="flex items-center justify-between"><Logo /><Link href="/profile" aria-label="Edit your profile"><Avatar name={profile.name} size="md" /></Link></header>
    <div><h1 className="font-serif text-4xl">Your events</h1><p className="mt-1 text-[14px] leading-relaxed text-muted">One profile, every conference. What you learn carries over.</p></div>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !events ? <LoadMessage loading /> : !events.length ? <div className="rounded-xl border border-dashed border-line p-6"><h2 className="font-serif text-2xl">Your next room starts here.</h2><p className="mt-2 text-sm text-muted">Add an event link to find people worth meeting.</p></div> : ([['now', 'Happening now'], ['upcoming', 'Coming up'], ['undated', 'Your events'], ['past', 'Past']] as const).map(([phase, label]) => {
      const group = events.filter((event) => eventPhase(event, now) === phase);
      return group.length > 0 && <section key={phase} className="flex flex-col gap-2"><SectionLabel>{label}</SectionLabel>{group.map((event) => <button key={event.conference_id} type="button" disabled={event.stage !== "ready"} onClick={() => open(event)} className={`rounded-xl border p-4 text-left disabled:opacity-60 ${event.conference_id === conferenceId ? "border-spectrum-1 bg-cream" : "border-line bg-card"}`}>
        {event.conference_id === conferenceId && <span className="mb-2 inline-block rounded-full bg-ink px-2.5 py-1 text-[11px] text-white">Current event</span>}
        <h2 className="font-serif text-[25px] leading-tight">{event.name || "Untitled event"}</h2><p className="mt-1 text-xs text-muted">{eventDate(event)}</p><p className="mt-3 text-[13px]">{event.stage === "failed" ? "Could not load this event. Add the link again to retry." : event.stage === "pending" ? "Finding people…" : `${event.people_found} people · ${event.counts.interesting} shortlisted · ${event.counts.met} met`}</p>
        {event.counts.drafts_pending > 0 && <p className="mt-2 text-xs text-alert">{event.counts.drafts_pending} follow-ups pending</p>}{event.stale && <p className="mt-2 text-xs text-muted">Saved snapshot</p>}
      </button>)}</section>;
    })}
    <Button className="mt-3 border-0 bg-subtle" fullWidth onClick={() => router.push("/event")}>+ Add another event</Button>
  </div><AppNav /></PhoneShell>;
}

export default function EventsPage() { return <RequireProfile>{(profile) => <Events profile={profile} />}</RequireProfile>; }
