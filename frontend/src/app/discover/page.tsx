"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppNav, Button, DesignIcon, FirstTip, LinkedInLink, PhoneShell, Portrait, RequireProfile, useToast } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type PersonCard, type TriageDecision } from "@/lib/api";
import { useSession } from "@/lib/session";
import { describeError } from "../onboarding/draft";

/** Match score at or above this shows the "Strong fit" chip and gradient border. */
const STRONG_FIT = 0.7;

function DiscoverDeck() {
  const router = useRouter();
  const params = useSearchParams();
  const reviewSkipped = params.get("review") === "skipped";
  const capture = params.get("capture") === "1";
  const topic = params.get("topic");
  const legacySheet = params.get("view") === "sheet";
  const { conferenceId, setCurrentPersonId } = useSession();
  const { showToast } = useToast();
  const [data, setData] = useState<{ people: PersonCard[]; queue: string[]; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [filters, setFilters] = useState(false);

  useEffect(() => {
    if (legacySheet) { router.replace("/sheet"); return; }
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    api.listPeople(conferenceId, "all").then(
      (people) => {
        if (cancelled) return;
        const queue = people.filter((p) => (!topic || p.topics.some((t) => t.toLowerCase() === topic.toLowerCase())) && (capture || (reviewSkipped ? p.triage === "not_interesting" : p.triage === null))).map((p) => p.id);
        setData({ people, queue, index: 0 }); setError(null);
      },
      (err) => { if (!cancelled) setError(describeError(err, "Could not load the room.")); },
    );
    return () => { cancelled = true; };
  }, [conferenceId, router, retry, reviewSkipped, capture, legacySheet, topic]);

  const current = data?.people.find((p) => p.id === data.queue[data.index]);
  const strong = !!current && current.score >= STRONG_FIT;
  const roundPhoto = !current?.photo_url || /avatar/i.test(current.photo_url);
  const role = current ? [current.title, current.company].filter(Boolean).join(" · ") : "";
  const opener = current?.openers[0]?.replace(/^["“]+|["”]+$/g, "").trim();
  const tag = current?.data_mode === "fixture" ? "Sample data" : current?.event_role;
  useEffect(() => { if (current) setCurrentPersonId(current.id); }, [current, setCurrentPersonId]);

  async function triage(decision: Exclude<TriageDecision, null>) {
    if (!conferenceId || !current || pending) return;
    setPending(true);
    try {
      await api.triage(conferenceId, current.id, decision);
      setData((prev) => prev && ({ ...prev, people: prev.people.map((p) => p.id === current.id ? { ...p, triage: decision } : p), index: prev.index + 1 }));
      showToast(decision === "interesting" ? "Added to your shortlist" : "Skipped. You can review them later.");
    } catch (err) { showToast(describeError(err, "Could not save that choice.")); }
    finally { setPending(false); }
  }

  return <PhoneShell>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data ? <LoadMessage loading /> : !current ? <div className="flex flex-1 flex-col px-5 pt-6 pb-6">
      <Link href="/today" className="text-sm text-alert">‹ Today</Link>
      <div className="my-auto flex flex-col gap-4 py-16"><span className="text-spectrum text-5xl" aria-hidden>✦</span><h1 className="font-serif text-[38px] leading-tight">{data.people.length ? "That’s everyone." : "No one in the room yet."}</h1><p className="text-[15px] leading-relaxed text-muted">{data.people.length ? `You have ${data.people.filter((p) => p.triage === "interesting").length} people on your shortlist. Keep the conversation going.` : "Add another event to discover people."}</p></div>
      <div className="flex flex-col gap-3"><Button fullWidth onClick={() => router.push("/sheet?view=skipped")}>Review skipped</Button><Button variant="primary" fullWidth onClick={() => router.push(data.people.length ? "/sheet" : "/events")}>{data.people.length ? "Open shortlist →" : "Your events →"}</Button></div>
    </div> : <div className="flex flex-1 flex-col gap-3 px-4 pb-5">
      <div className="flex items-center justify-between"><button aria-label="Back to Today" onClick={() => router.push("/today")} className="flex h-8 w-8 items-center"><DesignIcon name="back" /></button><span className="text-[14px]">{data.index + 1} of {data.queue.length}</span><button aria-label="Discovery options" aria-expanded={filters} onClick={() => setFilters(!filters)} className="flex h-8 w-8 items-center justify-end"><DesignIcon name="filter" /></button></div>
      {filters && <div className="flex flex-wrap gap-3 rounded-xl border border-line bg-card p-3 text-[13px]"><Link href="/graph" className="text-alert">Your graph</Link><Link href="/everyone" className="text-alert">Everyone</Link><Link href="/profile" className="text-alert">Edit interests</Link><Link href="/sheet" className="text-alert">Your shortlist</Link><Link href="/sheet?view=skipped" className="text-alert">Review skipped</Link><Link href="/events" className="text-alert">Switch event</Link></div>}
      <h1 className="font-serif text-[29px] leading-[1.3] tracking-[-0.01em]">{capture ? "Who did you meet?" : reviewSkipped ? "Another look." : topic ? `People into ${topic}` : "Who’s in the room?"}</h1>
      <div className="h-1 overflow-hidden rounded-full bg-subtle" aria-hidden><div className="h-full rounded-full bg-spectrum" style={{ width: `${((data.index + 1) / data.queue.length) * 100}%` }} /></div>
      {capture && <p className="text-sm text-muted">Find the person, then tap Add a note.</p>}
      <div className={`rounded-[20px] ${strong ? "bg-spectrum p-[2px]" : "border border-line"}`}>
      <article className="overflow-hidden rounded-[18px] bg-card">
        <Link href={`/person/${encodeURIComponent(current.id)}`} aria-label={`Open ${current.name}`} className={`relative flex items-center justify-center ${roundPhoto ? "h-[clamp(150px,25dvh,210px)] bg-cream" : "h-[clamp(160px,30dvh,260px)]"}`}>
          {roundPhoto ? <span className="relative block h-[120px] w-[120px] overflow-hidden rounded-full"><Portrait key={current.id} name={current.name} src={current.photo_url} /></span> : <Portrait key={current.id} name={current.name} src={current.photo_url} />}
          {tag && <span className="absolute top-3 left-3 max-w-[60%] truncate rounded-full bg-card px-2.5 py-1 text-[11px]">{tag}</span>}
          {strong && <span className="absolute top-3 right-3 rounded-full bg-spectrum px-2.5 py-1 text-[11px]">Strong fit</span>}
        </Link>
        <div className="flex flex-col gap-3 p-4">
          <div>
            <h2 className="font-serif text-[30px] leading-tight">{current.name}</h2>
            {role && <p className="mt-0.5 text-[13px] text-muted">{role}</p>}
          </div>
          {current.why.sentence && <p className="text-[15px] leading-[1.4] font-medium">{current.why.sentence}</p>}
          {opener && <div className="rounded-xl bg-cream px-4 py-3"><p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">Say</p><p className="font-serif text-[19px] leading-[1.25]">“{opener}”</p></div>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            <Link href={`/person/${encodeURIComponent(current.id)}`}>Details</Link>
            {current.linkedin_url && <LinkedInLink url={current.linkedin_url} name={current.name} />}
            <Link href={`/person/${encodeURIComponent(current.id)}/note`}>Add a note</Link>
          </div>
          {current.stale && <p className="text-xs text-muted">Saved snapshot · live refresh unavailable</p>}
        </div>
      </article>
      </div>
      {!capture && <FirstTip id="discover-interesting">Interesting adds them to your lead sheet. Nobody gets notified.</FirstTip>}
      <div className="flex gap-2.5"><Button className="h-[46px] font-normal text-alert" fullWidth disabled={pending} onClick={() => void triage("not_interesting")}>Skip</Button><Button className="h-[46px] font-normal" variant="primary" fullWidth disabled={pending} onClick={() => void triage("interesting")}>{pending ? "Saving…" : "Interesting"}</Button></div>
    </div>}
    <AppNav />
  </PhoneShell>;
}

export default function DiscoverPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><DiscoverDeck /></Suspense></RequireProfile>; }
