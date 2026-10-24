"use client";

import { Logo } from "@/components/Logo";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav, Avatar, Button, Card, PhoneShell, RequireProfile } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type Conference, type PersonCard, type Profile } from "@/lib/api";
import { eventDate, eventPhase } from "@/lib/events";
import { useSession } from "@/lib/session";
import { describeError } from "../onboarding/draft";

function Today({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const [data, setData] = useState<{ people: PersonCard[]; conference: Conference } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.listPeople(conferenceId, "interesting"), api.getConferenceStatus(conferenceId)]).then(
      ([people, conference]) => { if (!cancelled) { setData({ people, conference }); setError(null); } },
      (err) => { if (!cancelled) setError(describeError(err, "Could not load your day.")); },
    );
    return () => { cancelled = true; };
  }, [conferenceId, router, retry]);
  function open(person: PersonCard) { setCurrentPersonId(person.id); router.push(`/person/${encodeURIComponent(person.id)}/glance`); }
  const first = data?.people.find((p) => !p.met) ?? data?.people[0];

  return <PhoneShell><div className="flex flex-1 flex-col gap-4 px-4 pt-1 pb-6">
    <header className="flex items-center justify-between"><Link href="/events" className="font-serif text-[25px]" aria-label="Kairos · your events"><Logo /></Link><div className="flex items-center gap-3"><Link href="/events" className="text-xs text-muted">Your events</Link><Link href="/profile" aria-label="Edit profile"><Avatar name={profile.name} size="md" /></Link></div></header>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data ? <LoadMessage loading /> : <>
      <Link href="/events" className="rounded-xl bg-ink p-4 text-white"><span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px]">{data.conference.data_mode === "fixture" ? "Sample event" : eventPhase(data.conference, now) === "now" ? "Live now" : data.conference.stale ? "Saved snapshot" : "Your event"}</span><h1 className="mt-2 font-serif text-[26px] leading-tight">{data.conference.name || "Your event"}</h1><p className="mt-1 text-[13px] text-white/75">{[data.conference.city, eventDate(data.conference), `${data.people.length} shortlisted`].filter(Boolean).join(" · ")}</p></Link>
      {first && <section><h2 className="mb-3 text-[14px]">Up next</h2><button onClick={() => open(first)} className="flex w-full items-center gap-3 rounded-xl bg-cream p-4 text-left"><Avatar name={first.name} src={first.photo_url} size="lg" className="shrink-0 rounded-xl" /><span><span className="block text-[14px]">{first.name}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{first.notes.at(-1)?.text || first.next_step}</span></span></button></section>}
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[14px]">Your top 3</h2><Link href="/sheet" className="text-[13px] text-alert">See all</Link></div>
        {data.people.length ? <Card padded={false} radius="lg"><ol>{data.people.slice(0, 3).map((person, i) => <li key={person.id} className={i ? "border-t border-line" : ""}><button onClick={() => open(person)} className="flex w-full items-center gap-3 px-3 py-3 text-left"><span className="text-[14px] text-alert">{i + 1}</span><Avatar name={person.name} src={person.photo_url} size="lg" className="shrink-0 rounded-xl" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5 text-[14px]">{person.name}<span className={`rounded-full px-2 py-0.5 text-[10px] ${person.met ? "bg-cream" : "bg-subtle text-muted"}`}>{person.met ? "✓ Met" : "Not met"}</span></span><span className="mt-1 block truncate text-xs text-muted">{person.notes.at(-1)?.text || person.next_step}</span></span><span className="text-faint">›</span></button></li>)}</ol></Card> : <Card padded><p className="text-sm leading-relaxed text-muted">Your shortlist starts in Discover. Mark someone interesting, then find them here.</p></Card>}
      </section>
      <div className="mt-2 flex gap-2"><Button fullWidth variant="primary" onClick={() => router.push("/discover")}>Discover people</Button><Button fullWidth className="border-line" onClick={() => router.push("/recap")}>Day recap</Button></div>
      <div className="flex justify-center gap-5 text-xs text-muted"><Link href="/graph" className="py-2">Your graph →</Link><Link href="/profile" className="py-2">Refine your interests →</Link></div>
    </>}
  </div><AppNav /></PhoneShell>;
}
export default function TodayPage() { return <RequireProfile>{(profile) => <Today profile={profile} />}</RequireProfile>; }
