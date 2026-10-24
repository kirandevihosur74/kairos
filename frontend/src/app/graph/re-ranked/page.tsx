"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Button, Card, PhoneShell, RequireProfile } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type PersonCard, type Profile } from "@/lib/api";
import { previousRanking, type RankSnapshot } from "@/lib/ranking";
import { useSession } from "@/lib/session";
import { describeError } from "../../onboarding/draft";

function Results() {
  const router = useRouter(); const { conferenceId, setCurrentPersonId } = useSession();
  const [data, setData] = useState<{ people: PersonCard[]; profile: Profile; previous: RankSnapshot | null } | null>(null);
  const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0); const [showZero, setShowZero] = useState(false);
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.listPeople(conferenceId, "all"), api.getProfile()]).then(([people, profile]) => { if (!cancelled) { setData({ people, profile, previous: previousRanking(conferenceId) }); setError(null); } }, (err) => { if (!cancelled) setError(describeError(err, "Could not refresh the ranking.")); });
    return () => { cancelled = true; };
  }, [conferenceId, router, retry]);
  const ranked = data?.people.filter((p) => p.score > 0) ?? []; const zeros = data?.people.filter((p) => p.score === 0) ?? [];
  function delta(person: PersonCard) {
    if (!data?.previous) return null;
    const before = data.previous.order.indexOf(person.id); const after = data.people.findIndex((p) => p.id === person.id);
    return before < 0 ? null : before - after;
  }
  const mover = ranked.map((person) => ({ person, change: delta(person) ?? 0 })).sort((a, b) => b.change - a.change)[0];
  const added = data?.profile.interests.filter((i) => !data.previous?.interests.includes(i)) ?? [];
  return <PhoneShell withNavSpacer={false}><div className="flex flex-1 flex-col gap-4 px-5 pt-2"><Link href="/graph" className="text-sm">‹ Graph</Link><h1 className="font-serif text-[34px]">Who to meet</h1>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data ? <LoadMessage loading /> : <>
      <div className="rounded-xl bg-cream p-4"><p className="text-sm font-semibold">Re-ranked for {data.profile.interests.length} interests</p><p className="mt-1 text-[13px] leading-relaxed">{mover && mover.change > 0 ? `${mover.person.name} moved up ${mover.change} ${mover.change === 1 ? "place" : "places"}${added.length ? ` after adding ${added.join(", ")}` : " after your profile update"}.` : "Your matches now reflect your confirmed interests."}</p></div>
      <Card padded={false}><ol>{ranked.slice(0, 3).map((person, index) => { const change = delta(person); return <li key={person.id} className={index ? "border-t border-line" : ""}><button onClick={() => { setCurrentPersonId(person.id); router.push(`/person/${encodeURIComponent(person.id)}/glance`); }} className={`flex w-full items-center gap-3 p-3 text-left ${change && change > 0 ? "bg-cream/60" : ""}`}><span className="font-serif text-2xl">{index + 1}</span><Avatar name={person.name} src={person.photo_url} size="lg" className="shrink-0" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{person.name}</span><span className="mt-1 block truncate text-xs text-muted">{person.why.nodes.filter((n) => n.type === "Topic").map((n) => n.label).join(", ")}</span></span><span className="text-right text-xs"><span className="block">{person.why.nodes.filter((n) => n.type === "Topic").length} of {data.profile.interests.length}</span><span className={`mt-1 block ${change !== null && change < 0 ? "text-alert" : "text-muted"}`}>{change === null || change === 0 ? "—" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}`}</span></span></button></li>; })}{!ranked.length && <li className="p-4 text-sm text-muted">No shared interests yet. Try adding another interest.</li>}</ol></Card>
      {zeros.length > 0 && <details open={showZero} onToggle={(event) => setShowZero(event.currentTarget.open)} className="rounded-xl border border-line bg-card p-4"><summary className="text-sm text-muted">{zeros.length} people with no shared interests</summary><ul className="mt-3 space-y-3">{zeros.map((p) => <li key={p.id}><Link href={`/person/${encodeURIComponent(p.id)}`} className="text-sm text-ink">{p.name} <span className="text-xs text-muted">{p.title}</span></Link></li>)}</ul></details>}
      <p className="text-xs leading-relaxed text-muted">Fit = shared interests ÷ your interests. Not a hiring signal.{!data.previous && " Previous ranks are unavailable for this session."}</p>
      <Link href="/everyone" className="text-sm text-alert">See everyone at the event →</Link>
      <div className="app-actions mt-auto"><Button fullWidth variant="primary" onClick={() => router.push("/discover")}>Start sorting →</Button></div>
    </>}
  </div></PhoneShell>;
}
export default function ReRankedPage() { return <RequireProfile><Results /></RequireProfile>; }
