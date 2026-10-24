"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppNav, Avatar, Button, Card, PhoneShell, RequireProfile } from "@/components";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { LoadMessage } from "@/components/LoadMessage";
import { useEventPeople } from "@/lib/useEventPeople";
import { routeId } from "@/lib/ranking";

function Graph() {
  const router = useRouter(); const params = useSearchParams(); const { data, error, retry } = useEventPeople();
  const focused = params.get("person") ? routeId(params.get("person")!) : null;
  const person = data?.people.find((p) => p.id === focused) ?? data?.people[0];
  return <PhoneShell><div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-4"><header className="flex items-center justify-between text-sm"><Link href="/discover">‹ Discover</Link><Link href="/profile" className="text-alert">Edit interests</Link></header><h1 className="font-serif text-[32px] leading-tight">How you’re connected</h1>
    {error ? <LoadMessage error={error} onRetry={retry} /> : !data ? <LoadMessage loading /> : !person ? <p className="text-sm text-muted">No people at this event yet. Add another event to start.</p> : <>
      <div className="flex w-fit rounded-full bg-subtle p-[3px] text-[13px]"><span className="rounded-full bg-card px-4 py-2 font-semibold">Path to {person.name.split(" ")[0]}</span><Link href="/everyone" className="px-4 py-2 text-muted">Everyone</Link></div>
      <ConnectionGraph graph={person.why} person={person} />
      <Card padded><div className="flex items-center gap-3"><Avatar name={person.name} src={person.photo_url} size="lg" /><div><h2 className="font-serif text-[24px]">{person.name}</h2><p className="text-xs text-muted">{person.why.nodes.filter((n) => n.type === "Topic").length} shared interests · rank {data.people.findIndex((p) => p.id === person.id) + 1} of {data.people.length}</p></div></div><p className="mt-3 text-sm leading-relaxed">{person.why.sentence}</p><Link href={`/person/${encodeURIComponent(person.id)}/graph?tab=memory`} className="mt-3 block text-xs text-alert">Explore memory →</Link></Card>
      <div className="app-actions mt-auto"><Button fullWidth variant="primary" onClick={() => router.push(`/person/${encodeURIComponent(person.id)}`)}>Open {person.name.split(" ")[0]}’s card →</Button></div>
    </>}
  </div><AppNav /></PhoneShell>;
}
export default function GraphPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><Graph /></Suspense></RequireProfile>; }
