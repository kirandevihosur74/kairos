"use client";

import { Avatar, Card } from "@/components";
import type { PersonCard, WhyPath } from "@/lib/api";

export function ConnectionGraph({ graph, person }: { graph: WhyPath; person: PersonCard }) {
  const rows = [graph.nodes.filter((n) => n.type === "User"), graph.nodes.filter((n) => n.type === "Goal"), graph.nodes.filter((n) => n.type === "Topic"), graph.nodes.filter((n) => n.type === "Person")];
  const positions = new Map(rows.flatMap((nodes, row) => nodes.map((node, col) => [node.id, { x: ((col + 1) * 310) / (nodes.length + 1), y: 40 + row * 90 }] as const)));
  return <Card padded={false}><div className="relative min-h-[370px] overflow-x-auto p-4"><svg viewBox="0 0 310 350" className="absolute inset-4 h-[350px] w-[calc(100%-32px)]" aria-label="Connections from your profile to this person"><defs><linearGradient id="graph-connection"><stop stopColor="#f7d84a" /><stop offset="1" stopColor="#ee9bb5" /></linearGradient></defs>{graph.edges.map((edge, i) => { const from = positions.get(edge.from); const to = positions.get(edge.to); return from && to ? <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="url(#graph-connection)" strokeWidth="1.5"><title>{edge.label}</title></line> : null; })}</svg>{graph.nodes.map((node) => { const point = positions.get(node.id); if (!point) return null; return <div key={node.id} className="absolute flex max-w-[45%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `calc(16px + (100% - 32px) * ${point.x / 310})`, top: point.y + 16 }}>{node.type === "Person" ? <Avatar name={person.name} src={person.photo_url} size="lg" /> : <span className={`rounded-full px-3 py-2 text-center text-xs ${node.type === "Topic" ? "bg-cream" : "bg-ink text-white"}`}>{node.label || node.type}</span>}{node.type === "Person" && <span className="text-center text-xs">{node.label}</span>}</div>; })}</div></Card>;
}

