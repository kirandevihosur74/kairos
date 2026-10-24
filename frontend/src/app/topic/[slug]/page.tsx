"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Avatar, Button, Card, PhoneShell, RequireProfile, SectionLabel } from "@/components";
import { EventNetwork, sharesTopic } from "@/components/EventNetwork";
import { LoadMessage } from "@/components/LoadMessage";
import type { Profile } from "@/lib/api";
import { routeId } from "@/lib/ranking";
import { useEventPeople } from "@/lib/useEventPeople";

function Topic({ profile }: { profile: Profile }) {
  const params = useParams<{ slug: string }>(); const topic = routeId(params.slug);
  const router = useRouter(); const { data, error, retry } = useEventPeople();
  const people = data?.people.filter((p) => sharesTopic(p, topic)) ?? [];
  const shared = profile.interests.some((i) => i.toLowerCase() === topic.toLowerCase());
  return <PhoneShell withNavSpacer={false}><div className="flex flex-1 flex-col gap-4 px-5 pt-2"><Link href="/everyone" className="text-sm">‹ Everyone</Link><div><h1 className="font-serif text-[34px]">{topic}</h1>{data && <p className="mt-1 text-xs text-muted">{people.length} people {shared ? "share it with you" : "at this event list this topic"}</p>}</div>
    {error ? <LoadMessage error={error} onRetry={retry} /> : !data ? <LoadMessage loading /> : <>
      {people.length > 0 && <EventNetwork people={people} profile={profile} topic={topic} onPerson={(p) => router.push(`/graph?person=${encodeURIComponent(p.id)}`)} onTopic={() => {}} />}
      <SectionLabel>Ranked · {topic}</SectionLabel><Card padded={false}><ol>{people.map((person, index) => <li key={person.id} className={index ? "border-t border-line" : ""}><Link href={`/person/${encodeURIComponent(person.id)}/glance`} className="flex items-center gap-3 p-3"><Avatar name={person.name} src={person.photo_url} size="lg" /><span className="min-w-0 flex-1"><span className="block text-sm">{person.name}</span><span className="block truncate text-xs text-muted">{person.title}</span></span><span className="text-xs">{person.why.nodes.filter((n) => n.type === "Topic").length} of {profile.interests.length}</span></Link></li>)}{!people.length && <li className="p-4 text-sm text-muted">No people at this event list this topic.</li>}</ol></Card>
      <p className="text-[11px] text-muted">Connections use the topics actually collected for this event.</p>
      <div className="app-actions mt-auto"><Button variant="primary" fullWidth disabled={!people.length} onClick={() => router.push(`/discover?topic=${encodeURIComponent(topic)}`)}>Sort these {people.length} →</Button></div>
    </>}
  </div></PhoneShell>;
}
export default function TopicPage() { return <RequireProfile>{(profile) => <Suspense fallback={<LoadMessage loading />}><Topic profile={profile} /></Suspense>}</RequireProfile>; }
