"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  Chip,
  FactList,
  PhoneShell,
  ReachabilityPill,
  RequireProfile,
  SectionLabel,
  useToast,
} from "@/components";
import {
  ApiError,
  api,
  type GraphNode,
  type PersonCard,
  type TriageDecision,
  type WhyPath,
} from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

export default function DiscoverPage() {
  return (
    <RequireProfile>
      <Suspense
        fallback={
          <PhoneShell>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-muted">Loading…</span>
            </div>
            <AppNav />
          </PhoneShell>
        }
      >
        <DiscoverDeck />
      </Suspense>
    </RequireProfile>
  );
}

function DiscoverDeck() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { conferenceId, setCurrentPersonId } = useSession();
  const { showToast } = useToast();

  const isSheetView = searchParams.get("view") === "sheet";

  const [people, setPeople] = useState<EnrichedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);

  // Redirect to /event if no conferenceId.
  useEffect(() => {
    if (conferenceId === null) {
      router.replace("/event");
    }
  }, [conferenceId, router]);

  // Fetch people when a conferenceId is present.
  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.listPeople(conferenceId).then(
      (list) => {
        if (cancelled) return;
        setPeople(enrichMany(list));
      },
      (err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError && typeof err.detail === "string"
            ? err.detail
            : "Could not load the room.";
        setError(message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId]);

  const current = people && index < people.length ? people[index]! : null;
  const total = people?.length ?? 0;

  // Keep the session's currentPersonId in sync so the mic FAB can route to notes.
  useEffect(() => {
    if (!current) return;
    setCurrentPersonId(current.id);
  }, [current, setCurrentPersonId]);

  const interestingCount = useMemo(
    () => (people ?? []).filter((p) => p.triage === "interesting").length,
    [people],
  );
  const skippedCount = useMemo(
    () => (people ?? []).filter((p) => p.triage === "not_interesting").length,
    [people],
  );

  const handleTriage = useCallback(
    async (decision: Exclude<TriageDecision, null>) => {
      if (!conferenceId || !current || pending) return;
      setPending(true);
      const personId = current.id;
      try {
        const updated = await api.triage(conferenceId, personId, decision);
        setPeople((prev) =>
          prev
            ? prev.map((p) =>
                p.id === personId ? { ...p, triage: updated.decision } : p,
              )
            : prev,
        );
        showToast(
          decision === "interesting"
            ? "Marked interesting"
            : "Marked not interesting",
        );
        setIndex((i) => i + 1);
      } catch (err) {
        const message =
          err instanceof ApiError && typeof err.detail === "string"
            ? err.detail
            : "Could not save that choice.";
        showToast(message);
      } finally {
        setPending(false);
      }
    },
    [conferenceId, current, pending, showToast],
  );

  const deckDone =
    people !== null && people.length > 0 && index >= people.length;

  // While we are redirecting to /event we still render the shell to avoid flashes.
  if (!conferenceId) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted">Loading…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      {isSheetView ? (
        <div className="mx-5 mt-3 rounded-[12px] border border-line bg-subtle px-3 py-2 text-[12px] text-muted">
          Sheet view coming soon
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="font-serif text-[22px] text-ink">Something went off-script.</p>
          <p className="text-center text-sm text-muted">{error}</p>
        </div>
      ) : people === null ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted">Loading the room…</span>
        </div>
      ) : people.length === 0 ? (
        <EmptyRoom onBack={() => router.push("/today")} />
      ) : deckDone ? (
        <DeckDone
          total={total}
          interesting={interestingCount}
          skipped={skippedCount}
          onOpenShortlist={() => router.push("/today")}
          onReviewSkipped={() => router.push("/today")}
          onBack={() => router.push("/today")}
        />
      ) : current ? (
        <PersonDeckCard
          card={current}
          index={index}
          total={total}
          disabled={pending}
          onBack={() => router.push("/today")}
          onNotInteresting={() => handleTriage("not_interesting")}
          onInteresting={() => handleTriage("interesting")}
        />
      ) : null}

      <AppNav />
    </PhoneShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Person card (Figma 220:1234)                                               */
/* -------------------------------------------------------------------------- */

interface PersonDeckCardProps {
  card: EnrichedCard;
  index: number;
  total: number;
  disabled: boolean;
  onBack: () => void;
  onNotInteresting: () => void;
  onInteresting: () => void;
}

function PersonDeckCard({
  card,
  index,
  total,
  disabled,
  onBack,
  onNotInteresting,
  onInteresting,
}: PersonDeckCardProps) {
  const subtitle = buildSubtitle(card.title, card.company);
  const matchChipLabel = buildMatchChipLabel(card);
  const whyChips = buildWhyChips(card.why);
  const sourceUrl = card.sources[0]?.url ?? null;
  const provenance = describeProvenance(card);

  return (
    <div className="flex flex-1 flex-col px-5 pb-6">
      {/* Top row: back chevron + counter */}
      <div className="relative flex items-center justify-center pt-2 pb-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink"
        >
          <ChevronLeft />
        </button>
        <span className="text-[13px] font-medium text-muted">
          {index + 1} of {total}
        </span>
      </div>

      <h1 className="mb-4 font-serif text-[30px] leading-tight text-ink">
        Who&rsquo;s in the room?
      </h1>

      <Card radius="lg" padded={false} className="overflow-hidden">
        {/* Header strip */}
        <div className="relative h-[170px] bg-subtle">
          <div className="absolute left-3 top-3">
            <Chip tone="outline">
              {card.verified_match ? "✓ Verified match" : provenance.chip}
            </Chip>
          </div>
          {card.reachability_tag ? (
            <div className="absolute right-3 top-3">
              <ReachabilityPill value={card.reachability_tag} size="sm" />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Avatar
              name={card.name}
              src={card.photo_url}
              size="ring"
              strongFit={card.score === 1.0}
            />
          </div>
          {matchChipLabel ? (
            <div className="absolute bottom-3 right-3">
              <Chip tone="outline">{matchChipLabel}</Chip>
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 pb-5 pt-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-[30px] leading-tight text-ink">
              {card.name}
            </h2>
            {subtitle ? (
              <p className="text-[14px] text-muted">{subtitle}</p>
            ) : null}
          </div>

          {card.why.sentence ? (
            <div className="flex flex-col gap-2">
              <SectionLabel>Why</SectionLabel>
              <p className="text-[15px] leading-[1.4] text-ink">
                {card.why.sentence}
              </p>
            </div>
          ) : null}

          {whyChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {whyChips.map((chip, i) => (
                <Chip key={`${chip.label}-${i}`} tone={chip.tone}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          ) : null}

          {card.three_facts.length > 0 ? (
            <div className="flex flex-col gap-2 pt-1">
              <SectionLabel>Three things</SectionLabel>
              <FactList facts={card.three_facts} />
            </div>
          ) : null}

          {card.warm_intro_hint ? (
            <p className="text-sm text-muted">
              <span>Mention · </span>
              <span className="text-ink">
                {card.warm_intro_hint.connector}
              </span>
              {card.warm_intro_hint.via ? (
                <>
                  <span>, your connection at </span>
                  <span className="text-ink">
                    {card.warm_intro_hint.via}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}

          {card.next_step ? (
            <div className="flex flex-col gap-2">
              <SectionLabel>Next step</SectionLabel>
              <p className="text-[15px] leading-[1.4] text-ink">
                {card.next_step}
              </p>
            </div>
          ) : null}

          {sourceUrl ? (
            <p className="pt-1 text-[12px] text-faint">
              Source: {sourceUrl} · {provenance.detail}
            </p>
          ) : null}
        </div>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={disabled}
          onClick={onNotInteresting}
        >
          Not interesting
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={disabled}
          onClick={onInteresting}
        >
          Interesting
        </Button>
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Deck done (Figma 219:1413)                                                 */
/* -------------------------------------------------------------------------- */

interface DeckDoneProps {
  total: number;
  interesting: number;
  skipped: number;
  onOpenShortlist: () => void;
  onReviewSkipped: () => void;
  onBack: () => void;
}

function DeckDone({
  total,
  interesting,
  skipped,
  onOpenShortlist,
  onReviewSkipped,
  onBack,
}: DeckDoneProps) {
  return (
    <div className="flex flex-1 flex-col px-6 pb-6">
      <div className="relative flex items-center justify-center pt-2 pb-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink"
        >
          <ChevronLeft />
        </button>
        <span className="text-[13px] font-medium text-muted">
          {total} of {total} sorted
        </span>
      </div>

      <div className="mt-16 flex flex-col gap-3">
        <ShortlistStar />
        <h1 className="mt-2 font-serif text-[38px] leading-[1.05] text-ink">
          That&rsquo;s everyone.
        </h1>
        <p className="text-[15px] leading-[1.45] text-muted">
          You marked {interesting}{" "}
          {interesting === 1 ? "person" : "people"} as interesting. They&rsquo;re on
          your shortlist, ranked by how well they fit your goal.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip tone="outline">{interesting} interesting</Chip>
          <Chip tone="outline">{skipped} skipped</Chip>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onReviewSkipped}
        >
          Review skipped
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onOpenShortlist}
          trailing={<span aria-hidden>→</span>}
        >
          Open shortlist
        </Button>
      </div>
    </div>
  );
}

function ShortlistStar() {
  return (
    <svg
      viewBox="0 0 72 72"
      className="h-[72px] w-[72px]"
      aria-hidden
    >
      <path
        d="M36 6l9.2 18.6 20.6 3-14.9 14.5 3.5 20.5L36 53l-18.4 9.6 3.5-20.5L6.2 27.6l20.6-3L36 6z"
        fill="#f7d84a"
        stroke="#37352f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyRoom({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-serif text-[28px] leading-tight text-ink">
        No one in the room yet.
      </p>
      <p className="text-sm text-muted">
        As soon as the event roster shows up, the deck will fill in here.
      </p>
      <Button variant="secondary" size="md" onClick={onBack}>
        Back to Today
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildSubtitle(
  title: string | null,
  company: string | null,
): string | null {
  if (title && company) return `${title} at ${company}`;
  return title ?? company ?? null;
}

function buildMatchChipLabel(card: PersonCard): string | null {
  const why = card.why;
  // "Matched" topics are shared between the user side (User/Goal) and the
  // person side (Person). We count how many topic nodes are connected to a
  // person vs. how many are present in the graph.
  const topicNodes = why.nodes.filter((n) => n.type === "Topic");
  if (topicNodes.length === 0) return null;
  const personIds = new Set(
    why.nodes.filter((n) => n.type === "Person").map((n) => n.id),
  );
  const matched = topicNodes.filter((topic) =>
    why.edges.some(
      (edge) =>
        (edge.from === topic.id && personIds.has(edge.to)) ||
        (edge.to === topic.id && personIds.has(edge.from)),
    ),
  ).length;
  // score = matched / number of profile interests, so recover the denominator from it.
  const total = card.score > 0 ? Math.round(matched / card.score) : topicNodes.length;
  if (total === 0) return null;
  return `Matches ${matched} of ${total} interests`;
}

interface WhyChip {
  label: string;
  tone: "outline" | "on";
}

/**
 * Flatten the why graph into chip rows that read as:
 *   You → Goal → matched-topic ...   topic → Person
 * User and Goal nodes render as outline chips. Topic nodes (matched) render as
 * "on" (cream + ink border). Hop arrows are prepended to all but the first.
 */
function buildWhyChips(why: WhyPath): WhyChip[] {
  const nodes = why.nodes;
  if (nodes.length === 0) return [];

  const order: GraphNode["type"][] = ["User", "Goal", "Topic", "Person"];
  const sorted = [...nodes].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
  );

  return sorted.map((node, i) => {
    const isHop = i > 0;
    const prefix = isHop ? "→ " : "";
    const tone: WhyChip["tone"] = node.type === "Topic" ? "on" : "outline";
    return {
      label: `${prefix}${node.label}`,
      tone,
    };
  });
}

// Fixture people are fictional; live people come from the event page, possibly via an older snapshot.
function describeProvenance(card: PersonCard): { chip: string; detail: string } {
  if (card.data_mode === "fixture") {
    return { chip: "Sample data", detail: "fixture, not live" };
  }
  const collected = card.sources[0]?.collected_at;
  const when = collected
    ? new Date(collected).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const role = card.event_role
    ? card.event_role.charAt(0).toUpperCase() + card.event_role.slice(1)
    : "Listed on event page";
  if (card.stale) {
    return { chip: role, detail: `saved snapshot${when ? ` from ${when}` : ""}, live fetch failed` };
  }
  return { chip: role, detail: `from the event page${when ? `, ${when}` : ""}` };
}
