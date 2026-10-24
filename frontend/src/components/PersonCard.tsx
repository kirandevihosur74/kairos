import { Avatar } from "./Avatar";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { FactList } from "./FactList";
import { ReachabilityPill } from "./ReachabilityPill";
import { SectionLabel } from "./SectionLabel";
import type { EnrichedCard } from "@/lib/data/mocks";
import type { WhyPath } from "@/lib/api";

export interface PersonCardProps {
  card: EnrichedCard;
  className?: string;
}

function matchCounts(why: WhyPath): { shared: number; total: number } {
  const topicNodes = why.nodes.filter((n) => n.type === "Topic");
  const total = topicNodes.length;
  const personNode = why.nodes.find((n) => n.type === "Person");
  if (!personNode) return { shared: 0, total };
  const sharedIds = new Set<string>();
  for (const edge of why.edges) {
    const from = why.nodes.find((n) => n.id === edge.from);
    const to = why.nodes.find((n) => n.id === edge.to);
    if (!from || !to) continue;
    if (from.id === personNode.id && to.type === "Topic") sharedIds.add(to.id);
    if (to.id === personNode.id && from.type === "Topic") sharedIds.add(from.id);
  }
  return { shared: sharedIds.size, total };
}

export function PersonCard({ card, className }: PersonCardProps) {
  const { shared, total } = matchCounts(card.why);
  const subtitle = [card.title, card.company].filter(Boolean).join(" at ");

  return (
    <Card
      tone="plain"
      radius="lg"
      padded={false}
      className={className}
    >
      <div className="relative overflow-hidden rounded-t-[16px] bg-subtle">
        <div className="flex items-center justify-center py-9">
          <Avatar
            name={card.name}
            src={card.photo_url}
            size="ring"
            strongFit={shared === total && total > 0}
          />
        </div>
        <div className="absolute left-3 top-3">
          {card.verified_match ? (
            <Chip tone="outline">✓ Verified match</Chip>
          ) : (
            <Chip tone="outline">Sample data</Chip>
          )}
        </div>
        <div className="absolute right-3 top-3">
          {card.reachability_tag ? (
            <ReachabilityPill value={card.reachability_tag} size="sm" />
          ) : null}
        </div>
        <div className="absolute bottom-3 right-3">
          {total > 0 ? (
            <Chip tone="outline">
              Matches {shared} of {total} interests
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5 pt-4">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-[26px] leading-tight text-ink">
            {card.name}
          </p>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Why</SectionLabel>
          <p className="text-[15px] text-ink leading-relaxed">
            {card.why.sentence}
          </p>
        </div>

        {card.three_facts.length ? (
          <div className="flex flex-col gap-2">
            <SectionLabel>Three things</SectionLabel>
            <FactList facts={card.three_facts} />
          </div>
        ) : null}

        {card.warm_intro_hint ? (
          <p className="text-sm text-muted">
            <span className="text-muted">Mention · </span>
            <span className="text-ink">{card.warm_intro_hint.connector}</span>
            {card.warm_intro_hint.via ? (
              <>
                <span className="text-muted">, your connection at </span>
                <span className="text-ink">{card.warm_intro_hint.via}</span>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <SectionLabel>Next step</SectionLabel>
          <p className="text-[15px] text-ink leading-relaxed">
            {card.next_step}
          </p>
        </div>

        {card.sources[0]?.url ? (
          <p className="text-xs text-faint">
            Source: {card.sources[0].url} · fixture, not live
          </p>
        ) : null}
      </div>
    </Card>
  );
}
