"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppNav, Button, DesignIcon, PhoneShell, Portrait, RequireProfile, useToast } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type PersonCard, type TriageDecision } from "@/lib/api";
import { useSession } from "@/lib/session";
import { describeError } from "../onboarding/draft";

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
      {!capture && <div className="flex gap-4 text-xs text-muted"><Link href="/graph">Your graph →</Link><Link href="/everyone">Everyone →</Link></div>}
      {capture && <p className="text-sm text-muted">Find the person, then tap Add a note.</p>}
      <article className="overflow-hidden rounded-xl border border-line bg-card">
        <Link href={`/person/${encodeURIComponent(current.id)}`} className="relative block h-[clamp(160px,32dvh,280px)]">
          <Portrait key={current.id} name={current.name} src={current.photo_url} />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-black/75" />
          <span className="absolute top-3 left-3 max-w-[70%] truncate rounded-full bg-card px-2.5 py-1 text-[11px]">{current.data_mode === "fixture" ? "Sample data" : current.event_role || "Listed on event page"}</span>
          <span className="absolute top-3 right-3 rounded-full bg-spectrum px-2.5 py-1 text-[11px]">{Math.round(current.score * 100)} fit</span>
          <div className="absolute inset-x-4 bottom-3 text-white"><h2 className="font-serif text-[29px] leading-tight">{current.name}</h2><p className="mt-1 text-[13px] text-white/85">{[current.title, current.company].filter(Boolean).join(" · ")}</p></div>
        </Link>
        <div className="flex flex-col gap-3 bg-cream px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-1.5">{current.why.nodes.filter((n) => n.label).map((node, i) => <span key={node.id} className="contents">{i > 0 && <span className="text-faint" aria-hidden>›</span>}<span className={`rounded-md bg-card px-2 py-1 text-[11px] ${node.type === "Goal" ? "text-alert" : ""}`}>{node.label}</span></span>)}</div>
          <div><p className="mb-1 text-[11px] text-muted">Open with</p><p className="text-[14px] leading-[1.45]">{current.openers[0] || current.next_step}</p></div>
          {current.fun_fact && <div><p className="mb-1 text-[11px] text-muted">Small talk</p><p className="text-[14px]">{current.fun_fact}</p></div>}
          {current.stale && <p className="text-xs text-muted">Saved snapshot · live refresh unavailable</p>}
        </div>
      </article>
      <div className="flex gap-2.5"><Button className="h-[46px] font-normal text-alert" fullWidth disabled={pending} onClick={() => void triage("not_interesting")}>Skip</Button><Button className="h-[46px] font-normal" variant="primary" fullWidth disabled={pending} onClick={() => void triage("interesting")}>{pending ? "Saving…" : "Interesting"}</Button></div>
      <Link href={`/person/${encodeURIComponent(current.id)}/note`} className="flex min-h-8 items-center justify-center gap-1.5 text-[13px] text-alert"><Image src="/design/emoji-note.svg" alt="" width={16} height={16} unoptimized />Already met? Add a note</Link>
    </div>}
    <AppNav />
  </PhoneShell>;
}

export default function DiscoverPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><DiscoverDeck /></Suspense></RequireProfile>; }
