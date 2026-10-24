"use client";

import Link from "next/link";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppNav, Avatar, Button, Card, PhoneShell, RequireProfile, SectionLabel } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type DraftRow, type PersonCard, type PersonMemory, type WhyPath } from "@/lib/api";
import { useSession } from "@/lib/session";
import { routeId } from "@/lib/ranking";
import { describeError } from "../../../onboarding/draft";

function GraphView() {
  const { id: rawId } = useParams<{ id: string }>();
  // Decode before building links so person IDs are not URL-encoded twice.
  const id = routeId(rawId);
  const params = useSearchParams();
  const memoryTab = params.get("tab") === "memory";
  const router = useRouter();
  const { conferenceId } = useSession();
  const [data, setData] = useState<{ person: PersonCard; graph: WhyPath; memory: PersonMemory; drafts: DraftRow[]; people: PersonCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const base = `/person/${encodeURIComponent(id)}`;
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.getPerson(id, conferenceId), api.getPersonGraph(id, conferenceId), api.getMemory(id, conferenceId), api.listDrafts(conferenceId), api.listPeople(conferenceId, "all")]).then(
      ([person, graph, memory, drafts, people]) => { if (!cancelled) { setData({ person, graph, memory, drafts: drafts.filter((d) => d.person_id === id), people }); setError(null); } },
      (err) => { if (!cancelled) setError(describeError(err, "Could not load this graph.")); },
    );
    return () => { cancelled = true; };
  }, [conferenceId, id, router, retry]);

  return <PhoneShell><div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
    <header className="flex items-center justify-between text-sm"><Link href={base}>‹ {data?.person.name || "Person"}</Link><Link href="/profile" className="text-alert">Edit interests</Link></header>
    <h1 className="font-serif text-[32px] leading-tight">{memoryTab ? "What Kairos remembers" : "How you’re connected"}</h1>
    <div className="flex w-[220px] rounded-full bg-subtle p-[3px]">{[[base + "/graph", "Why", !memoryTab], [base + "/graph?tab=memory", "Memory", memoryTab]].map(([href, label, active]) => <Link key={String(label)} href={String(href)} className={`flex-1 rounded-full py-2 text-center text-[13px] ${active ? "bg-card font-semibold" : "text-muted"}`}>{label}</Link>)}</div>
    {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data ? <LoadMessage loading /> : memoryTab ? <>
      <p className="text-[13px] leading-relaxed text-muted">Your notes and approved drafts stay connected to {data.person.name}, including memories from other events.</p>
      <Card padded><div className="flex flex-col items-center gap-3"><Avatar name={data.person.name} src={data.person.photo_url} size="xl" /><p className="font-serif text-2xl">{data.person.name}</p><div className="h-6 w-px bg-spectrum" /><div className="flex flex-wrap justify-center gap-2">{data.person.notes.map((note) => <a key={note.id} href={`#note-${note.id}`} className="max-w-full truncate rounded-full bg-cream px-3 py-2 text-xs">{note.text}</a>)}{data.drafts.map((draft) => <Link key={draft.id} href={`/drafts/${encodeURIComponent(draft.id)}`} className="rounded-full bg-subtle px-3 py-2 text-xs">Follow-up · {draft.status}</Link>)}</div></div></Card>
      <SectionLabel>Your notes · {data.person.notes.length}</SectionLabel>
      {data.person.notes.length ? <Card padded className="space-y-4">{data.person.notes.map((note) => <div id={`note-${note.id}`} key={note.id} className="scroll-mt-4"><p className="text-sm">{note.text}</p><p className="mt-1 text-xs text-muted">Written by you · {new Date(note.created_at).toLocaleString()}</p></div>)}</Card> : <p className="text-sm text-muted">No notes yet. Capture what you learned after you meet.</p>}
      {data.memory.items.length > 0 && <><SectionLabel>Across your events</SectionLabel>{data.memory.items.map((item) => <Card padded key={item.id}><p className="text-sm font-medium">{item.summary}</p><p className="mt-2 text-sm text-muted">{item.text}</p><p className="mt-2 break-words text-xs text-muted">{item.path.join(" → ")}</p></Card>)}</>}
      <Button fullWidth variant="primary" onClick={() => router.push(`/drafts/new/type?person=${encodeURIComponent(id)}`)}>Draft from memory →</Button>
    </> : <>
      <div className="flex gap-2 text-[13px]"><button className="rounded-full bg-card px-4 py-2 font-semibold">Path to {data.person.name.split(" ")[0]}</button><Link href="/everyone" className="rounded-full px-4 py-2 text-muted">Everyone</Link></div>
      <ConnectionGraph graph={data.graph} person={data.person} />
      <Card padded><p className="text-[14px] leading-relaxed">{data.graph.sentence || "No shared interests yet. Update your interests to discover more connections."}</p><p className="mt-2 text-xs text-muted">Based on your confirmed interests and the event roster.</p></Card>
      <Button fullWidth variant="primary" onClick={() => router.push(base)}>Open {data.person.name.split(" ")[0]}’s card →</Button>
    </>}
  </div><AppNav /></PhoneShell>;
}


export default function PersonGraphPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><GraphView /></Suspense></RequireProfile>; }
