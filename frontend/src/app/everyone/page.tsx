"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppNav, Avatar, Button, Card, PhoneShell, RequireProfile } from "@/components";
import { EventNetwork } from "@/components/EventNetwork";
import { LoadMessage } from "@/components/LoadMessage";
import type { Profile } from "@/lib/api";
import { useEventPeople } from "@/lib/useEventPeople";

type Filter = "all" | "interesting" | "met" | "speakers";
function Everyone({ profile }: { profile: Profile }) {
  const router = useRouter(); const { data, error, retry } = useEventPeople();
  const [filter, setFilter] = useState<Filter>("all"); const [list, setList] = useState(false);
  const people = data?.people ?? [];
  const groups = { all: people, interesting: people.filter((p) => p.triage === "interesting"), met: people.filter((p) => !!p.met), speakers: people.filter((p) => p.event_role?.toLowerCase().includes("speaker")) };
  const visible = groups[filter]; const topics = [...new Set(visible.flatMap((p) => p.topics))];
  return <PhoneShell><div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-4"><Link href="/discover" className="text-sm">‹ Discover</Link><div><h1 className="font-serif text-[32px] leading-tight">Everyone at {data?.conference.name || "your event"}</h1>{data && <p className="mt-1 text-xs text-muted">{people.length} people, grouped by your {profile.interests.length} interests</p>}</div>
    <div className="flex w-fit rounded-full bg-subtle p-[3px] text-[13px]"><Link href="/graph" className="px-4 py-2 text-muted">Your paths</Link><span className="rounded-full bg-card px-4 py-2 font-semibold">Everyone</span></div>
    {error ? <LoadMessage error={error} onRetry={retry} /> : !data ? <LoadMessage loading /> : <>
      <div className="flex flex-wrap gap-1.5" aria-label="Filter event people">{([['all','All'],['interesting','Interesting'],['met','Met'],['speakers','Speakers']] as const).map(([key,label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full px-3 py-2 text-[11px] ${filter === key ? "bg-spectrum text-ink" : "bg-subtle text-muted"}`}>{label} {groups[key].length}</button>)}</div>
      {!list && <EventNetwork people={visible} profile={profile} onPerson={(p) => router.push(`/graph?person=${encodeURIComponent(p.id)}`)} onTopic={(topic) => router.push(`/topic/${encodeURIComponent(topic)}`)} />}
      {!list && <><p className="text-[11px] leading-relaxed text-muted">Gradient ring: strong interest fit · ✓ met. Tap a topic to expand it, or a person to see their path.</p><div className="flex flex-wrap gap-2">{topics.map((topic) => <Link key={topic} href={`/topic/${encodeURIComponent(topic)}`} className="rounded-full bg-cream px-3 py-2 text-xs">{topic}</Link>)}</div></>}
      {list && <Card padded={false}><ul>{visible.map((p, index) => <li key={p.id} className={index ? "border-t border-line" : ""}><Link href={`/person/${encodeURIComponent(p.id)}`} className="flex items-center gap-3 p-3"><Avatar name={p.name} src={p.photo_url} size="lg" /><span className="min-w-0 flex-1"><span className="block text-sm">{p.name}</span><span className="block truncate text-xs text-muted">{[p.title,p.company].filter(Boolean).join(" · ")}</span></span><span className="text-xs">{Math.round(p.score * 100)}% fit</span></Link></li>)}{!visible.length && <li className="p-4 text-sm text-muted">No people match this filter.</li>}</ul></Card>}
      <Button fullWidth className="mt-auto border-line bg-subtle" onClick={() => setList(!list)}>{list ? "See as a graph" : "See as a ranked list"}</Button>
    </>}
  </div><AppNav /></PhoneShell>;
}
export default function EveryonePage() { return <RequireProfile>{(profile) => <Everyone profile={profile} />}</RequireProfile>; }
