"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppNav, Avatar, Button, Card, PhoneShell, RequireProfile, SectionLabel } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type DraftRow, type PersonCard, type PersonMemory, type WhyPath } from "@/lib/api";
import { useSession } from "@/lib/session";
import { describeError } from "../../../onboarding/draft";

function GraphView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const memoryTab = params.get("tab") === "memory";
  const router = useRouter();
  const { conferenceId } = useSession();
  const [data, setData] = useState<{ person: PersonCard; graph: WhyPath; memory: PersonMemory; drafts: DraftRow[]; people: PersonCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [everyone, setEveryone] = useState(false);
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
      <Button fullWidth variant="primary" onClick={() => router.push(`/drafts/new?person=${encodeURIComponent(id)}`)}>Draft from memory →</Button>
    </> : <>
      <div className="flex gap-2 text-[13px]"><button className={`rounded-full px-4 py-2 ${!everyone ? "bg-card font-semibold" : "text-muted"}`} onClick={() => setEveryone(false)}>Path to {data.person.name.split(" ")[0]}</button><button className={`rounded-full px-4 py-2 ${everyone ? "bg-card font-semibold" : "text-muted"}`} onClick={() => setEveryone(true)}>Everyone</button></div>
      {everyone ? <div className="space-y-3">{[...new Set(data.people.flatMap((p) => p.topics))].map((topic) => <Card padded key={topic}><SectionLabel>{topic}</SectionLabel><div className="mt-3 flex flex-wrap gap-2">{data.people.filter((p) => p.topics.includes(topic)).map((p) => <Link key={p.id} href={`/person/${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-2 rounded-full bg-subtle py-1 pr-3 pl-1 text-xs"><Avatar name={p.name} src={p.photo_url} size="sm" />{p.name}</Link>)}</div></Card>)}{!data.people.some((p) => p.topics.length > 0) && <p className="text-sm text-muted">No topics have been collected for this event yet.</p>}</div> : <ConnectionGraph graph={data.graph} person={data.person} />}
      <Card padded><p className="text-[14px] leading-relaxed">{data.graph.sentence || "No shared interests yet. Update your interests to discover more connections."}</p><p className="mt-2 text-xs text-muted">Based on your confirmed interests and the event roster.</p></Card>
      <Button fullWidth variant="primary" onClick={() => router.push(base)}>Open {data.person.name.split(" ")[0]}’s card →</Button>
    </>}
  </div><AppNav /></PhoneShell>;
}

function ConnectionGraph({ graph, person }: { graph: WhyPath; person: PersonCard }) {
  const rows = [graph.nodes.filter((n) => n.type === "User"), graph.nodes.filter((n) => n.type === "Goal"), graph.nodes.filter((n) => n.type === "Topic"), graph.nodes.filter((n) => n.type === "Person")];
  const positions = new Map(rows.flatMap((nodes, row) => nodes.map((node, col) => [node.id, { x: ((col + 1) * 310) / (nodes.length + 1), y: 40 + row * 90 }] as const)));
  return <Card padded={false}><div className="relative min-h-[370px] overflow-x-auto p-4"><svg viewBox="0 0 310 350" className="absolute inset-4 h-[350px] w-[calc(100%-32px)]" aria-label="Connections from your profile to this person"><defs><linearGradient id="graph-connection"><stop stopColor="#f7d84a" /><stop offset="1" stopColor="#ee9bb5" /></linearGradient></defs>{graph.edges.map((edge, i) => { const from = positions.get(edge.from); const to = positions.get(edge.to); return from && to ? <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="url(#graph-connection)" strokeWidth="1.5"><title>{edge.label}</title></line> : null; })}</svg>{graph.nodes.map((node) => { const point = positions.get(node.id); if (!point) return null; return <div key={node.id} className="absolute flex max-w-[45%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `calc(16px + (100% - 32px) * ${point.x / 310})`, top: point.y + 16 }}>{node.type === "Person" ? <Avatar name={person.name} src={person.photo_url} size="lg" /> : <span className={`rounded-full px-3 py-2 text-center text-xs ${node.type === "Topic" ? "bg-cream" : "bg-ink text-white"}`}>{node.label || node.type}</span>}{node.type === "Person" && <span className="text-center text-xs">{node.label}</span>}</div>; })}</div></Card>;
}

export default function PersonGraphPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><GraphView /></Suspense></RequireProfile>; }
