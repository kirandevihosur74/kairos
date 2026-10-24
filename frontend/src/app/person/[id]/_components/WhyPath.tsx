"use client";

import { Avatar, Chip } from "@/components";
import type { WhyPath as WhyPathType, GraphNode } from "@/lib/api";

interface WhyPathDiagramProps {
  why: WhyPathType;
  personName: string;
}

type DiagramNode = GraphNode & { role: "user" | "goal" | "topic" | "person" };

function tagRoles(nodes: GraphNode[]): DiagramNode[] {
  const mapped: DiagramNode[] = nodes.map((n) => {
    let role: DiagramNode["role"] = "topic";
    if (n.type === "User") role = "user";
    else if (n.type === "Goal") role = "goal";
    else if (n.type === "Person") role = "person";
    else role = "topic";
    return { ...n, role };
  });
  return mapped;
}

function nodeTone(role: DiagramNode["role"]) {
  switch (role) {
    case "user":
      return "outline" as const;
    case "goal":
      return "outline" as const;
    case "topic":
      return "on" as const;
    case "person":
      return "outline" as const;
  }
}

/**
 * Why-path diagram adapted from Figma node 219:1319.
 *
 * Lays out nodes left-to-right (user → topic clusters → person) and connects
 * them with a short gradient hairline edge rendered via SVG so it reads as a
 * single horizontal flow. On narrow widths the row wraps.
 */
export function WhyPathDiagram({ why, personName }: WhyPathDiagramProps) {
  const nodes = tagRoles(why.nodes);
  if (nodes.length === 0) return null;

  // Pair up each node with the edge that departs from it (so each row item
  // ends with its outgoing connector label).
  const edgeFrom = new Map<string, string>();
  for (const edge of why.edges) {
    if (!edgeFrom.has(edge.from)) edgeFrom.set(edge.from, edge.label);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;
          const edgeLabel = edgeFrom.get(node.id);
          return (
            <div key={node.id} className="flex items-center gap-1.5">
              {node.role === "person" ? (
                <Chip
                  tone={nodeTone(node.role)}
                  leading={<Avatar name={personName} size="sm" />}
                  className="pl-1"
                >
                  {node.label}
                </Chip>
              ) : (
                <Chip tone={nodeTone(node.role)}>{node.label}</Chip>
              )}
              {!isLast ? (
                <EdgeConnector label={edgeLabel} />
              ) : null}
            </div>
          );
        })}
      </div>
      {why.sentence ? (
        <p className="text-[13px] leading-[1.5] text-muted">{why.sentence}</p>
      ) : null}
    </div>
  );
}

function EdgeConnector({ label }: { label?: string }) {
  return (
    <span className="flex min-w-[36px] shrink-0 flex-col items-center">
      {label ? (
        <span className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.04em] text-faint">
          {label}
        </span>
      ) : null}
      <svg
        viewBox="0 0 36 6"
        className="h-[6px] w-9"
        aria-hidden
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="whypath-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f7d84a" />
            <stop offset="35%" stopColor="#f2a14b" />
            <stop offset="68%" stopColor="#ef8474" />
            <stop offset="100%" stopColor="#ee9bb5" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="3"
          x2="30"
          y2="3"
          stroke="url(#whypath-edge)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M30 0.5 L35.5 3 L30 5.5 Z"
          fill="#ef8474"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}
