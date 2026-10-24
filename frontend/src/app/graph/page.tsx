"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type Profile, type WhyPath } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";
import { EditInterestsSheet } from "./_components/EditInterestsSheet";
import { PathGraph } from "./_components/PathGraph";
import { PathTabs } from "./_components/PathTabs";

export default function GraphPage() {
  return (
    <Suspense fallback={null}>
      <RequireProfile>
        {(profile) => <GraphView profile={profile} />}
      </RequireProfile>
    </Suspense>
  );
}

function GraphView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { conferenceId, setCurrentPersonId } = useSession();

  const editing = searchParams.get("edit") === "1";

  const [profileState, setProfileState] = useState<Profile>(profile);
  const [people, setPeople] = useState<EnrichedCard[] | null>(null);
  const [why, setWhy] = useState<WhyPath | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the sorted shortlist.
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
            : "Could not load this event.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, router]);

  // The focused person — "default: top-scored" per PR brief. We honour an
  // existing session.currentPersonId when it's still present in the list.
  const focused: EnrichedCard | null = useMemo(() => {
    if (!people || people.length === 0) return null;
    return people[0] ?? null;
  }, [people]);

  // Pull the multi-hop graph for the focused person.
  useEffect(() => {
    if (!conferenceId || !focused) return;
    let cancelled = false;
    api.getPersonGraph(focused.id, conferenceId).then(
      (w) => {
        if (cancelled) return;
        setWhy(w);
      },
      () => {
        if (cancelled) return;
        // Fall back to the focused person's cached why path.
        setWhy(focused.why);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, focused]);

  // Keep nav mic FAB wired to the focused person.
  useEffect(() => {
    if (focused) setCurrentPersonId(focused.id);
  }, [focused, setCurrentPersonId]);

  const closeSheet = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("edit");
    const s = q.toString();
    router.push(`/graph${s ? `?${s}` : ""}`);
  }, [router, searchParams]);

  const handleSaved = useCallback(
    (next: Profile) => {
      setProfileState(next);
      // Snapshot was taken inside the sheet; just route to re-ranked.
      router.push("/graph/re-ranked");
    },
    [router],
  );

  // "No shared interests" peers — people with triage !== not_interesting and no
  // topic overlap with you. Capped to 2 to match the Figma's SR/CP slots.
  // NOTE: hooks must run before any early return so we compute this before
  // the loading-shell short-circuit.
  const noSharedPeers = useMemo(() => {
    if (!people) return [];
    const myInterests = new Set(
      profileState.interests.map((i) => i.toLowerCase()),
    );
    return people
      .filter((p) => p.id !== focused?.id)
      .filter((p) => {
        const theirs = (p.topics ?? []).map((t) => t.toLowerCase());
        return !theirs.some((t) => myInterests.has(t));
      })
      .slice(0, 2);
  }, [people, focused, profileState.interests]);

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

  const matchedCount = focused ? countMatched(focused.why) : 0;
  const totalInterests = profileState.interests.length;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-10 pt-2">
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push("/discover")}
            className="text-[14px] font-medium text-ink hover:underline"
          >
            ‹ Discover
          </button>
          <Link
            href="/graph?edit=1"
            className="text-[14px] font-semibold text-ink hover:underline"
          >
            Edit interests
          </Link>
        </div>

        <h1 className="font-serif text-[32px] leading-[1.05] text-ink">
          How you&rsquo;re connected
        </h1>

        <PathTabs
          focusName={focused?.name ?? null}
          active="path"
          pathHref="/graph"
          everyoneHref="/everyone"
        />

        {/* Canvas — hairline border per Graph rules */}
        <div className="overflow-hidden rounded-[12px] border border-line bg-card">
          {error ? (
            <div className="flex h-[400px] items-center justify-center px-5 text-center">
              <p className="text-sm text-alert">{error}</p>
            </div>
          ) : !focused || !why ? (
            <div className="flex h-[400px] items-center justify-center">
              <span className="text-sm text-muted">Loading the graph…</span>
            </div>
          ) : (
            <PathGraph why={why} focused={focused} others={noSharedPeers} />
          )}
        </div>

        {/* Focused person summary card */}
        {focused ? (
          <Card radius="md" padded className="flex items-start gap-3">
            <Avatar
              name={focused.name}
              src={focused.photo_url}
              size="lg"
              strongFit={focused.score === 1.0}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 className="font-serif text-[22px] leading-[1.1] text-ink">
                {focused.name}
              </h2>
              <p className="text-[13px] text-muted">
                Matches {matchedCount} of {totalInterests || matchedCount}{" "}
                interests · rank 1 of {people?.length ?? 1}
              </p>
              <p className="mt-1 text-[13px] font-medium text-ink">
                {buildWhyLine(focused.why)}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                From a multi-hop FalkorDB query
              </p>
            </div>
          </Card>
        ) : null}

        <div className="mt-auto pt-2">
          {focused ? (
            <Link href={`/person/${encodeURIComponent(focused.id)}`}>
              <Button variant="primary" size="lg" fullWidth>
                Open {focused.name.split(" ")[0]}&rsquo;s card &nbsp;→
              </Button>
            </Link>
          ) : (
            <SectionLabel>No focused person yet</SectionLabel>
          )}
        </div>
      </div>

      {editing ? (
        <EditInterestsSheet
          profile={profileState}
          people={people ?? []}
          onClose={closeSheet}
          onSaved={handleSaved}
        />
      ) : null}

      <AppNav />
    </PhoneShell>
  );
}

function countMatched(why: WhyPath): number {
  const topics = why.nodes.filter((n) => n.type === "Topic").map((n) => n.id);
  const personIds = new Set(
    why.nodes.filter((n) => n.type === "Person").map((n) => n.id),
  );
  let matched = 0;
  for (const topicId of topics) {
    const hit = why.edges.some(
      (edge) =>
        (edge.from === topicId && personIds.has(edge.to)) ||
        (edge.to === topicId && personIds.has(edge.from)),
    );
    if (hit) matched += 1;
  }
  return matched;
}

function buildWhyLine(why: WhyPath): string {
  const user = why.nodes.find((n) => n.type === "User");
  const goal = why.nodes.find((n) => n.type === "Goal");
  const topics = why.nodes
    .filter((n) => n.type === "Topic")
    .map((n) => n.label);
  const person = why.nodes.find((n) => n.type === "Person");

  const parts: string[] = [];
  if (user) parts.push("You");
  if (goal) parts.push(goal.label);
  if (topics.length) parts.push(topics.join(", "));
  if (person) parts.push(person.label.split(" ")[0] ?? person.label);
  return parts.join(" → ");
}
