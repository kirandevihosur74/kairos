"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, LinkedInLink, PhoneShell, Portrait, RequireProfile } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type PersonCard, type Profile } from "@/lib/api";
import { routeId } from "@/lib/ranking";
import { useSession } from "@/lib/session";
import { describeError } from "../../../onboarding/draft";

function Glance({ profile }: { profile: Profile }) {
  const params = useParams<{ id: string }>(); const id = routeId(params.id);
  const router = useRouter(); const { conferenceId, setCurrentPersonId } = useSession();
  const [data, setData] = useState<{ person: PersonCard; queue: PersonCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.getPerson(id, conferenceId), api.listPeople(conferenceId, "interesting")]).then(([person, people]) => {
      if (cancelled) return;
      const queue = people.filter((p) => !p.met).slice(0, 3);
      setData({ person, queue: queue.some((p) => p.id === id) ? queue : [person, ...queue] }); setError(null); setCurrentPersonId(id);
    }, (err) => { if (!cancelled) setError(describeError(err, "Could not load this brief.")); });
    return () => { cancelled = true; };
  }, [conferenceId, id, router, retry, setCurrentPersonId]);
  const person = data?.person;
  const index = data?.queue.findIndex((p) => p.id === id) ?? 0;
  const facts = person ? [...new Set([person.signals[0] || person.who, person.fun_fact, ...person.topics.map((topic) => topic)].filter((x): x is string => !!x))].slice(0, 3) : [];
  return <PhoneShell withNavSpacer={false} fullBleed>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data || !person ? <LoadMessage loading /> : <div className="flex flex-1 flex-col">
      <div className="relative min-h-[230px] h-[46dvh] max-h-[430px] shrink-0"><Portrait key={person.id} name={person.name} src={person.photo_url} /><div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        <span className="absolute top-[max(20px,env(safe-area-inset-top))] left-5 rounded-full bg-card px-3 py-1.5 text-[11px]">{index + 1} of {data.queue.length} to meet</span>
        <Link href="/today" aria-label="Close glance brief" className="absolute top-[max(18px,env(safe-area-inset-top))] right-5 flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 text-2xl">×</Link>
        <div className="absolute inset-x-5 bottom-5 text-white"><div className="mb-3 flex flex-wrap gap-2">{person.event_role && <span className="rounded-full bg-card px-3 py-1 text-[11px] text-ink">{person.event_role}</span>}{person.reachability && <span className="rounded-full bg-card px-3 py-1 text-[11px] text-ink">{person.reachability}</span>}{person.data_mode === "fixture" && <span className="rounded-full bg-card px-3 py-1 text-[11px] text-ink">Sample data</span>}</div><h1 className="font-serif text-[40px] leading-none">{person.name}</h1><p className="mt-2 text-[13px] text-white/85">{[person.title, person.company].filter(Boolean).join(" · ")}</p></div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <section className="rounded-xl bg-cream p-4"><p className="mb-2 text-[11px] font-semibold uppercase text-muted">Say</p><p className="font-serif text-[24px] leading-[1.15]">{person.openers[0] || person.next_step}</p></section>
        {facts.length > 0 && <section><h2 className="mb-2 text-[11px] font-semibold uppercase text-muted">About {person.name.split(" ")[0]}</h2><ul className="space-y-2">{facts.map((fact) => { const shared = profile.interests.some((i) => i.toLowerCase() === fact.toLowerCase()); return <li key={fact} className="flex items-start gap-2 text-[14px]"><span aria-hidden className={shared ? "text-amber" : "text-faint"}>•</span><span className="flex-1">{fact}</span>{shared && <span className="rounded-full bg-cream px-2 py-1 text-[10px] text-alert">In common</span>}</li>; })}</ul></section>}
        {person.warm_intro && <p className="text-[13px] text-muted">{person.warm_intro}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2"><LinkedInLink url={person.linkedin_url} name={person.name} /><Link href={`/person/${encodeURIComponent(id)}`} className="text-xs text-alert">Full profile and memory →</Link></div>
        <div className="app-actions mt-auto flex gap-2.5"><Button fullWidth onClick={() => router.replace(data.queue.length > 1 ? `/person/${encodeURIComponent(data.queue[(index + 1) % data.queue.length].id)}/glance` : "/today")}>{data.queue.length > 1 ? "Next person" : "Back to Today"}</Button><Button variant="primary" fullWidth onClick={() => router.push(`/person/${encodeURIComponent(id)}/note`)}>I met {person.name.split(" ")[0]}</Button></div>
      </div>
    </div>}
  </PhoneShell>;
}
export default function GlancePage() { return <RequireProfile>{(profile) => <Suspense fallback={<LoadMessage loading />}><Glance profile={profile} /></Suspense>}</RequireProfile>; }
