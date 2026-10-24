"use client";

import { Avatar } from "@/components";
import type { GraphEdge, GraphNode, PersonCard, WhyPath } from "@/lib/api";

interface PathGraphProps {
  why: WhyPath;
  /** The focused person — needed because /graph fixtures sometimes don't include a Person node. */
  focused: Pick<PersonCard, "id" | "name" | "photo_url" | "score"> | null;
  /** Other people to draw as faded nodes at the bottom (SR/CP style in the Figma). */
  others?: Array<Pick<PersonCard, "id" | "name" | "photo_url">>;
}

const CANVAS_W = 350;
const CANVAS_H = 400;

/**
 * 6.1 Graph canvas. Draws You → Goal → Topic chips → Person(s).
 * The backend's `/people/{id}/graph` returns Topic hops only (no cross-event
 * network edges), so we lay out one Goal row + a horizontal rail of topic
 * chips. Backend TODO = richer graph with person-to-person edges beyond topics.
 */
export function PathGraph({ why, focused, others = [] }: PathGraphProps) {
  const nodes = why.nodes;
  const edges = why.edges;

  const user = nodes.find((n) => n.type === "User");
  const goal = nodes.find((n) => n.type === "Goal");
  const topics = nodes.filter((n) => n.type === "Topic");
  const persons = nodes.filter((n) => n.type === "Person");

  // Layout: You pill at top center, Goal chip beneath, topics spread
  // horizontally, person avatars radiate downward from each topic.
  const centerX = CANVAS_W / 2;

  const youY = 40;
  const goalY = 110;
  const topicY = 200;
  const personY = 300;

  const topicXs = positionsAcross(topics.length, 60, CANVAS_W - 60);

  // Which topic each person is connected to.
  const topicIdSet = new Set(topics.map((t) => t.id));
  const edgeMap = new Map<string, string[]>(); // personId -> topicIds
  for (const edge of edges) {
    if (topicIdSet.has(edge.from) && persons.some((p) => p.id === edge.to)) {
      pushTo(edgeMap, edge.to, edge.from);
    } else if (topicIdSet.has(edge.to) && persons.some((p) => p.id === edge.from)) {
      pushTo(edgeMap, edge.from, edge.to);
    }
  }

  // Build the primary (focused) person entry — if the WhyPath has one Person
  // node, use it; otherwise synthesise from `focused`.
  const primaryPerson =
    persons[0] ??
    (focused
      ? ({
          id: focused.id,
          label: focused.name,
          type: "Person" as const,
        })
      : null);

  // Position the focused avatar in the middle; faded "no shared interest"
  // peers sit at the sides.
  const primaryX = centerX;
  const sideXs = positionsAcross(others.length, 44, CANVAS_W - 44);

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="block h-[400px] w-full"
      aria-label="Graph of how you are connected to this person"
    >
      <defs>
        <linearGradient id="pathgraph-spectrum" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f7d84a" />
          <stop offset="35%" stopColor="#f2a14b" />
          <stop offset="68%" stopColor="#ef8474" />
          <stop offset="100%" stopColor="#ee9bb5" />
        </linearGradient>
      </defs>

      {/* Edge: You -> Goal */}
      {goal ? (
        <EdgeLine
          x1={centerX}
          y1={youY + 24}
          x2={centerX}
          y2={goalY - 12}
          label={labelBetween(edges, user?.id, goal.id) ?? "HAS_GOAL"}
          labelSide="right"
        />
      ) : null}

      {/* Edges: Goal -> each Topic */}
      {goal
        ? topics.map((t, i) => (
            <EdgeLine
              key={`g-${t.id}`}
              x1={centerX}
              y1={goalY + 12}
              x2={topicXs[i]!}
              y2={topicY - 12}
              label={i === 0 ? labelBetween(edges, goal.id, t.id) ?? "TARGETS" : undefined}
              labelSide="right"
            />
          ))
        : null}

      {/* Edges: Topic -> focused person */}
      {primaryPerson
        ? topics.map((t, i) => (
            <EdgeLine
              key={`t-${t.id}`}
              x1={topicXs[i]!}
              y1={topicY + 12}
              x2={primaryX}
              y2={personY - 20}
              label={i === topics.length - 1 ? "INTERESTED_IN" : undefined}
              labelSide="right"
            />
          ))
        : null}

      {/* You pill */}
      <g>
        <circle cx={centerX} cy={youY} r={24} fill="#37352f" />
        <text
          x={centerX}
          y={youY + 5}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="14"
          fontFamily="var(--font-serif), Georgia, serif"
        >
          You
        </text>
      </g>

      {/* Goal chip (ink/dark pill) */}
      {goal ? (
        <GoalChip x={centerX} y={goalY} label={goal.label} />
      ) : null}

      {/* Topic chips (cream pills) */}
      {topics.map((t, i) => (
        <TopicChip key={t.id} x={topicXs[i]!} y={topicY} label={t.label} />
      ))}

      {/* Focused person avatar + name */}
      {primaryPerson ? (
        <PersonAvatar
          x={primaryX}
          y={personY}
          name={focused?.name ?? primaryPerson.label}
          src={focused?.photo_url ?? null}
          strongFit={focused?.score === 1.0}
        />
      ) : null}

      {/* Faded side avatars (no shared interest, from `others`) */}
      {others.map((p, i) => (
        <FadedAvatar key={p.id} x={sideXs[i]!} y={personY} name={p.name} />
      ))}

      {/* "No shared interests" caption */}
      {others.length > 0 ? (
        <text
          x={centerX}
          y={personY + 70}
          textAnchor="middle"
          fontSize="11"
          fill="#787774"
          fontFamily="var(--font-sans), sans-serif"
        >
          No shared interests
        </text>
      ) : null}
    </svg>
  );
}

function GoalChip({ x, y, label }: { x: number; y: number; label: string }) {
  // Use foreignObject so we get the real text metrics via a span and a dark
  // rounded pill that resembles the Chip ink tone.
  const padX = 12;
  const h = 28;
  // approximate width by char count — SVG lacks measurement; we overprovision.
  const w = Math.min(220, Math.max(120, label.length * 7 + padX * 2));
  return (
    <foreignObject x={x - w / 2} y={y - h / 2} width={w} height={h}>
      <div
        style={{
          background: "#37352f",
          border: "1px solid #37352f",
          color: "#ffffff",
          borderRadius: 999,
          fontSize: 13,
          lineHeight: `${h - 2}px`,
          textAlign: "center",
          height: h,
          width: w,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: "var(--font-sans), sans-serif",
          fontWeight: 500,
          padding: `0 ${padX}px`,
          boxSizing: "border-box",
        }}
      >
        {label}
      </div>
    </foreignObject>
  );
}

function TopicChip({ x, y, label }: { x: number; y: number; label: string }) {
  const padX = 12;
  const h = 28;
  const w = Math.min(180, Math.max(70, label.length * 7 + padX * 2));
  return (
    <foreignObject x={x - w / 2} y={y - h / 2} width={w} height={h}>
      <div
        style={{
          background: "#fbf3db",
          color: "#37352f",
          borderRadius: 999,
          fontSize: 13,
          lineHeight: `${h}px`,
          textAlign: "center",
          height: h,
          width: w,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: "var(--font-sans), sans-serif",
          fontWeight: 500,
          padding: `0 ${padX}px`,
          boxSizing: "border-box",
        }}
      >
        {label}
      </div>
    </foreignObject>
  );
}

function PersonAvatar({
  x,
  y,
  name,
  src,
  strongFit,
}: {
  x: number;
  y: number;
  name: string;
  src: string | null;
  strongFit: boolean | undefined;
}) {
  const size = 56;
  return (
    <foreignObject x={x - size / 2 - 4} y={y - size / 2 - 4} width={size + 8} height={size + 36}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          fontFamily: "var(--font-sans), sans-serif",
        }}
      >
        <Avatar name={name} src={src} size="xl" strongFit={strongFit} />
        <span style={{ fontSize: 11, color: "#37352f", fontWeight: 500 }}>
          {name}
        </span>
      </div>
    </foreignObject>
  );
}

function FadedAvatar({ x, y, name }: { x: number; y: number; name: string }) {
  const size = 36;
  return (
    <foreignObject x={x - size / 2 - 4} y={y - size / 2 - 4} width={size + 8} height={size + 32}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          opacity: 0.7,
          fontFamily: "var(--font-sans), sans-serif",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: size,
            height: size,
            borderRadius: 999,
            background: "transparent",
            border: "1px solid #e9e9e7",
            color: "#787774",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontFamily: "var(--font-serif), Georgia, serif",
          }}
        >
          {initials(name)}
        </span>
        <span style={{ fontSize: 11, color: "#787774", fontWeight: 500 }}>
          {name}
        </span>
      </div>
    </foreignObject>
  );
}

function EdgeLine({
  x1,
  y1,
  x2,
  y2,
  label,
  labelSide,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  labelSide?: "left" | "right";
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = labelSide === "left" ? -8 : 8;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="url(#pathgraph-spectrum)"
        strokeWidth="1.5"
        opacity="0.75"
      />
      {label ? (
        <text
          x={mx + dx}
          y={my}
          fontSize="9"
          letterSpacing="0.04em"
          fill="#787774"
          fontFamily="var(--font-sans), sans-serif"
          fontWeight={500}
        >
          {label.toUpperCase()}
        </text>
      ) : null}
    </g>
  );
}

function positionsAcross(count: number, left: number, right: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(left + right) / 2];
  const step = (right - left) / (count - 1);
  return Array.from({ length: count }, (_, i) => left + i * step);
}

function pushTo(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function labelBetween(
  edges: GraphEdge[],
  from: string | undefined,
  to: string | undefined,
): string | undefined {
  if (!from || !to) return undefined;
  const match = edges.find(
    (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
  );
  return match?.label;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Re-export GraphNode so adjacent files can import without pulling @/lib/api.
export type { GraphNode };
