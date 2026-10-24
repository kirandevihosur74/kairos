"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  PhoneShell,
  RequireProfile,
} from "@/components";
import { ApiError, api, type PersonCard, type Profile } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

const SNAPSHOT_KEY = "kairos.rank.snapshot";

export default function ReRankedPage() {
  return (
    <Suspense fallback={null}>
      <RequireProfile>
        {(profile) => <ReRankedView profile={profile} />}
      </RequireProfile>
    </Suspense>
  );
}

function ReRankedView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const [people, setPeople] = useState<EnrichedCard[] | null>(null);
  const [snapshot, setSnapshot] = useState<string[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      return null;
    }
  });
  // Reference setSnapshot so it stays part of the hook if we later need to
  // invalidate the snapshot client-side.
  void setSnapshot;
  const [showNoShared, setShowNoShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conferenceId) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    api.listPeople(conferenceId).then(
      (list) => {
        if (cancelled) return;
        setPeople(enrichMany(list));
      },
      (err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && typeof err.detail === "string"
            ? err.detail
            : "Could not load your shortlist.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, router]);

  const interests = profile.interests;

  const ranked = useMemo(() => {
    if (!people) return null;
    return people.map((person, newIdx) => {
      const oldIdx = snapshot ? snapshot.indexOf(person.id) : -1;
      let delta: number | null = null;
      if (oldIdx >= 0) delta = oldIdx - newIdx; // positive = moved up
      const matched = countMatchedInterests(person, interests);
      return { person, newIdx, oldIdx, delta, matched };
    });
  }, [people, snapshot, interests]);

  const topThree = ranked?.filter((r) => r.matched > 0).slice(0, 3) ?? [];
  const noShared = ranked?.filter((r) => r.matched === 0) ?? [];

  // Which person moved first? Prefer the biggest positive mover.
  const biggestMover = useMemo(() => {
    if (!ranked) return null;
    let best: (typeof ranked)[number] | null = null;
    for (const row of ranked) {
      if (row.delta === null || row.delta <= 0) continue;
      if (!best || row.delta > (best.delta ?? 0)) best = row;
    }
    return best;
  }, [ranked]);

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-10 pt-2">
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push("/discover")}
            className="text-[14px] font-medium text-ink hover:underline"
          >
            ‹ Discover
          </button>
        </div>

        <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
          Who to meet
        </h1>

        {/* Cream info banner */}
        <Card
          radius="md"
          padded
          className="border-0 bg-cream text-ink"
        >
          <p className="text-[14px] font-semibold leading-tight">
            Re-ranked for {interests.length}{" "}
            {interests.length === 1 ? "interest" : "interests"}
          </p>
          <p className="mt-1 text-[13px] leading-[1.45]">
            {biggestMover
              ? `${biggestMover.person.name} moved up ${biggestMover.delta} ${
                  biggestMover.delta === 1 ? "place" : "places"
                } because you added ${lastAdded(interests)}.`
              : `Your top matches below reflect ${interests.join(", ")}.`}
          </p>
        </Card>

        {/* Numbered 3-up list */}
        <Card radius="md" padded={false} className="overflow-hidden">
          {error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-alert">{error}</p>
            </div>
          ) : !ranked ? (
            <div className="px-4 py-6 text-center">
              <span className="text-sm text-muted">Loading…</span>
            </div>
          ) : topThree.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="text-sm text-muted">
                No shared-interest matches yet. Edit your interests to see
                people re-rank.
              </span>
            </div>
          ) : (
            <ul>
              {topThree.map((row, idx) => (
                <li
                  key={row.person.id}
                  className={
                    (idx > 0 ? "border-t border-line " : "") +
                    (row === biggestMover ? "bg-cream/60 " : "")
                  }
                >
                  <RankedRow
                    rank={idx + 1}
                    row={row}
                    totalInterests={interests.length}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* "N people with no shared interests · Show" */}
        {noShared.length > 0 ? (
          <Card radius="md" padded={false} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNoShared((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[13px] font-medium text-muted">
                {noShared.length}{" "}
                {noShared.length === 1 ? "person" : "people"} with no shared
                interests
              </span>
              <span className="text-[13px] font-semibold text-ink">
                {showNoShared ? "Hide" : "Show"}
              </span>
            </button>
            {showNoShared ? (
              <ul className="border-t border-line">
                {noShared.map((row) => (
                  <li key={row.person.id} className="border-b border-line last:border-b-0">
                    <RankedRow
                      rank={row.newIdx + 1}
                      row={row}
                      totalInterests={interests.length}
                      faded
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {/* Fit caption */}
        <p className="text-[12px] text-muted">
          Fit = shared interests ÷ your interests. Not a hiring signal.
        </p>

        <div className="mt-auto pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            Start sorting &nbsp;→
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

interface RankedRowProps {
  rank: number;
  row: {
    person: EnrichedCard;
    delta: number | null;
    matched: number;
  };
  totalInterests: number;
  faded?: boolean;
}

function RankedRow({ rank, row, totalInterests, faded }: RankedRowProps) {
  const { person, delta, matched } = row;
  const matchedLine = matchedInterestsLine(person);
  return (
    <div
      className={
        "flex items-start gap-3 px-4 py-3 " + (faded ? "opacity-70" : "")
      }
    >
      <span className="w-5 shrink-0 pt-1 font-serif text-[22px] leading-none text-ink">
        {rank}
      </span>
      <Avatar
        name={person.name}
        src={person.photo_url}
        size="lg"
        strongFit={person.score === 1.0}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-ink">
          {person.name}
        </span>
        <span className="truncate text-[12px] text-muted">
          {matchedLine || person.topics?.slice(0, 2).join(", ") || "—"}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
        <span className="text-[13px] font-medium text-ink">
          {matched} of {totalInterests || matched}
        </span>
        <Delta delta={delta} />
      </div>
    </div>
  );
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return (
      <span className="text-[12px] font-semibold text-muted">—</span>
    );
  }
  if (delta > 0) {
    return (
      <span className="text-[12px] font-semibold text-ink">▲ {delta}</span>
    );
  }
  return (
    <span className="text-[12px] font-semibold text-alert">
      ▼ {Math.abs(delta)}
    </span>
  );
}

function countMatchedInterests(person: PersonCard, interests: string[]): number {
  if (!interests.length) return 0;
  const theirs = new Set((person.topics ?? []).map((t) => t.toLowerCase()));
  let n = 0;
  for (const i of interests) if (theirs.has(i.toLowerCase())) n += 1;
  return n;
}

function matchedInterestsLine(person: PersonCard): string {
  // Derive matched topics from why.nodes to keep the copy in sync with the
  // graph canvas on 6.1.
  const topics = person.why?.nodes
    .filter((n) => n.type === "Topic")
    .map((n) => n.label);
  return (topics ?? []).join(", ");
}

function lastAdded(interests: string[]): string {
  if (interests.length === 0) return "a new interest";
  return interests[interests.length - 1]!;
}
