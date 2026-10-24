"use client";

import { Avatar } from "./Avatar";
import type { PersonCard, Profile } from "@/lib/api";

export function sharesTopic(person: PersonCard, topic: string) { return person.topics.some((t) => t.toLowerCase() === topic.toLowerCase()); }

/** Every edge is derived from a roster topic or a confirmed profile interest. */
export function EventNetwork({ people, profile, topic, onPerson, onTopic }: {
  people: PersonCard[]; profile: Profile; topic?: string; onPerson: (person: PersonCard) => void; onTopic: (topic: string) => void;
}) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const person of people) for (const item of new Set(person.topics.map((t) => t.toLowerCase()))) {
    const label = person.topics.find((t) => t.toLowerCase() === item)!;
    counts.set(item, { label, count: (counts.get(item)?.count ?? 0) + 1 });
  }
  const allTopics = [...counts.values()].sort((a, b) => Number(profile.interests.some((t) => t.toLowerCase() === b.label.toLowerCase())) - Number(profile.interests.some((t) => t.toLowerCase() === a.label.toLowerCase())) || b.count - a.count);
  const topics = topic ? [{ label: topic, count: people.filter((p) => sharesTopic(p, topic)).length }] : allTopics.slice(0, 3);
  const visible = people.slice(0, 8);
  const center = { x: 175, y: 210 };
  const positions = visible.map((person, index) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(visible.length, 1); return { person, x: center.x + Math.cos(angle) * 135, y: center.y + Math.sin(angle) * 170 }; });
  const topicPositions = topics.map((item, index) => ({ ...item, ...(topic ? { x: 175, y: 210 } : [{ x: 95, y: 140 }, { x: 250, y: 145 }, { x: 170, y: 285 }][index]) }));
  return <div className="overflow-hidden rounded-xl border border-line bg-card">
    <div className="relative h-[430px]" role="group" aria-label={topic ? `People connected to ${topic}` : "People and their shared interests"}>
      <svg viewBox="0 0 350 430" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {topicPositions.map((t) => <g key={t.label}>{!topic && profile.interests.some((i) => i.toLowerCase() === t.label.toLowerCase()) && <line x1={center.x} y1={center.y} x2={t.x} y2={t.y} stroke="#ef8474" strokeWidth="1.5" />}{positions.filter(({ person }) => sharesTopic(person, t.label)).map(({ person, x, y }) => <line key={person.id} x1={x} y1={y} x2={t.x} y2={t.y} stroke={person.score > 0 ? "#ef8474" : "#e9e9e7"} strokeWidth={person.score > 0 ? 1.5 : 1} />)}</g>)}
      </svg>
      {!topic && <div className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink font-serif text-white" style={{ left: "50%", top: center.y }}>You</div>}
      {positions.map(({ person, x, y }) => <button key={person.id} type="button" aria-label={`Show path to ${person.name}`} onClick={() => onPerson(person)} className="absolute flex w-[74px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-[10px]" style={{ left: `${x / 3.5}%`, top: y }}><span className={`relative rounded-full p-[3px] ${person.score >= 0.5 ? "bg-spectrum" : "bg-card"}`}><Avatar name={person.name} src={person.photo_url} size={person.score >= 0.5 ? "lg" : "md"} />{person.met && <span className="absolute right-0 bottom-0 rounded bg-ink px-1 text-[9px] text-white" aria-label="Met">✓</span>}</span><span className="max-w-full truncate rounded bg-card/90 px-1">{person.name}</span></button>)}
      {topicPositions.map((t) => <button key={t.label} type="button" onClick={() => onTopic(t.label)} className="absolute max-w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream px-3 py-2 text-center text-[11px]" style={{ left: `${t.x / 3.5}%`, top: t.y }}>{t.label} · {t.count}</button>)}
      {!people.length && <p className="absolute inset-x-5 bottom-12 text-center text-sm text-muted">No people match this filter.</p>}
      {(people.length > visible.length || (!topic && allTopics.length > 3)) && <p className="absolute inset-x-3 bottom-2 text-center text-[11px] text-muted">{people.length > visible.length ? `${people.length - visible.length} more people in the list below` : `${allTopics.length - 3} more topics below`}</p>}
    </div>
  </div>;
}
