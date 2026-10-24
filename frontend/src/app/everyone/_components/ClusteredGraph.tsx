"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components";
import type { PersonCard } from "@/lib/api";

export interface Cluster {
  topic: string;
  count: number;
  people: PersonCard[];
}

interface ClusteredGraphProps {
  clusters: Cluster[];
  /** Max people to render per topic — the rest become "+ N more" chips. */
  perTopicMax?: number;
}

const CANVAS_W = 350;
const CANVAS_H = 420;

/**
 * 7.1 Clustered graph canvas (also reused by 7.2 with a single cluster).
 * Lays out:
 *  - "You" ink pill at the center
 *  - Cream topic-hub chips with "· count" placed around You
 *  - Avatars orbit around each hub (size by score; strongFit=true wraps in a
 *    spectrum ring; met/warm/speaker glyphs via /public/emoji)
 */
export function ClusteredGraph({ clusters, perTopicMax = 2 }: ClusteredGraphProps) {
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;

  // Place up to 3 clusters at these anchor points (above, below-left, below-right).
  const hubs = clusters.slice(0, 3).map((cluster, i) => {
    const pos = hubPosition(i, clusters.length);
    return { ...cluster, x: pos.x, y: pos.y };
  });

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-line bg-card">
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="block h-[420px] w-full"
      >
        <defs>
          <linearGradient id="clustered-spectrum" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f7d84a" />
            <stop offset="35%" stopColor="#f2a14b" />
            <stop offset="68%" stopColor="#ef8474" />
            <stop offset="100%" stopColor="#ee9bb5" />
          </linearGradient>
        </defs>

        {/* Soft orbit rings */}
        <circle
          cx={centerX}
          cy={centerY}
          r={82}
          fill="none"
          stroke="#f1f1ef"
          strokeWidth="1"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={148}
          fill="none"
          stroke="#f1f1ef"
          strokeWidth="1"
        />

        {/* You → hub lines */}
        {hubs.map((hub) => (
          <line
            key={`line-${hub.topic}`}
            x1={centerX}
            y1={centerY}
            x2={hub.x}
            y2={hub.y}
            stroke="url(#clustered-spectrum)"
            strokeWidth="1.5"
            opacity="0.6"
          />
        ))}
      </svg>

      {/* Overlaid HTML elements — easier for text layout and link targets */}
      <div className="absolute inset-0">
        {/* You pill */}
        <div
          className="absolute flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[14px] font-serif text-white"
          style={{
            left: centerX - 22,
            top: centerY - 22,
          }}
        >
          You
        </div>

        {hubs.map((hub) => (
          <Hub key={hub.topic} hub={hub} centerX={centerX} centerY={centerY} perTopicMax={perTopicMax} />
        ))}
      </div>
    </div>
  );
}

interface HubProps {
  hub: Cluster & { x: number; y: number };
  centerX: number;
  centerY: number;
  perTopicMax: number;
}

function Hub({ hub, centerX, centerY, perTopicMax }: HubProps) {
  const slug = topicSlug(hub.topic);
  const peoplePositions = orbitPositions(hub, centerX, centerY, perTopicMax);
  const extra = Math.max(0, hub.count - peoplePositions.length);

  return (
    <>
      {/* Edges hub -> each person */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      >
        {peoplePositions.map((p) => (
          <line
            key={`e-${hub.topic}-${p.person.id}`}
            x1={hub.x}
            y1={hub.y}
            x2={p.x}
            y2={p.y}
            stroke="url(#clustered-spectrum)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
      </svg>

      {/* Topic hub chip */}
      <Link
        href={`/topic/${encodeURIComponent(slug)}`}
        className="absolute inline-flex items-center justify-center rounded-full bg-cream px-3 py-[6px] text-[12px] font-medium text-ink hover:bg-[#f3e8c0]"
        style={{
          left: hub.x,
          top: hub.y,
          transform: "translate(-50%, -50%)",
          whiteSpace: "nowrap",
        }}
      >
        {hub.topic} · {hub.count}
      </Link>

      {/* People avatars */}
      {peoplePositions.map((p) => (
        <PersonMarker
          key={p.person.id}
          person={p.person}
          x={p.x}
          y={p.y}
          strongFit={p.strongFit}
        />
      ))}

      {/* "+N more" chip for overflow */}
      {extra > 0 ? (
        <Link
          href={`/topic/${encodeURIComponent(slug)}`}
          className="absolute inline-flex items-center justify-center rounded-full bg-card px-3 py-[6px] text-[12px] font-medium text-muted hover:text-ink"
          style={{
            left: hub.x,
            top: hub.y + 60,
            transform: "translate(-50%, 0)",
            border: "1px solid #e9e9e7",
            whiteSpace: "nowrap",
          }}
        >
          + {extra} more
        </Link>
      ) : null}
    </>
  );
}

interface PersonMarkerProps {
  person: PersonCard;
  x: number;
  y: number;
  strongFit: boolean;
}

function PersonMarker({ person, x, y, strongFit }: PersonMarkerProps) {
  const met = person.met !== null;
  const warm = (person.reachability ?? "").toLowerCase() === "warm";
  const speaker = (person.talks ?? []).length > 0;

  // Pick the status glyph; preference order Met > Warm > Speaker.
  const glyph: { src: string; alt: string } | null = met
    ? { src: "/emoji/met.svg", alt: "Met" }
    : warm
      ? { src: "/emoji/warm.svg", alt: "Warm" }
      : speaker
        ? { src: "/emoji/speaker.svg", alt: "Speaker" }
        : null;

  const size = Math.max(28, Math.round(28 + 20 * (person.score ?? 0.4))); // 28..48

  return (
    <Link
      href={`/person/${encodeURIComponent(person.id)}`}
      aria-label={person.name}
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
      }}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <Avatar
          name={person.name}
          src={person.photo_url}
          size={size >= 44 ? "lg" : size >= 36 ? "md" : "sm"}
          strongFit={strongFit}
        />
        {glyph ? (
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card"
            style={{ boxShadow: "0 0 0 1px #e9e9e7" }}
          >
            <Image src={glyph.src} alt={glyph.alt} width={14} height={14} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

interface Positioned {
  person: PersonCard;
  x: number;
  y: number;
  strongFit: boolean;
}

function orbitPositions(
  hub: Cluster & { x: number; y: number },
  centerX: number,
  centerY: number,
  max: number,
): Positioned[] {
  const take = hub.people.slice(0, max);
  // Spread people along the outer orbit around the hub, 55-70 px away.
  const base = Math.atan2(hub.y - centerY, hub.x - centerX);
  const results: Positioned[] = [];
  for (let i = 0; i < take.length; i += 1) {
    const spread = (i - (take.length - 1) / 2) * 0.9;
    const r = 60;
    const angle = base + spread;
    const x = hub.x + Math.cos(angle) * r;
    const y = hub.y + Math.sin(angle) * r;
    const person = take[i]!;
    results.push({
      person,
      x,
      y,
      strongFit: (person.score ?? 0) >= 1.0,
    });
  }
  return results;
}

function hubPosition(index: number, total: number): { x: number; y: number } {
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;
  if (total <= 1) return { x: centerX, y: centerY - 100 };
  const anchors = [
    { x: centerX, y: centerY - 95 }, // top
    { x: centerX - 100, y: centerY + 60 }, // bottom-left
    { x: centerX + 100, y: centerY + 60 }, // bottom-right
  ];
  return anchors[index] ?? { x: centerX, y: centerY };
}

export function topicSlug(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
