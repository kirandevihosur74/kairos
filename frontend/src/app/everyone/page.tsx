"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Button,
  Chip,
  PhoneShell,
  RequireProfile,
} from "@/components";
import { ApiError, api, type PersonCard, type Profile } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";
import { PathTabs } from "../graph/_components/PathTabs";
import { ClusteredGraph, type Cluster } from "./_components/ClusteredGraph";

type CategoryKey = "all" | "interesting" | "met" | "speakers";

export default function EveryonePage() {
  return (
    <Suspense fallback={null}>
      <RequireProfile>
        {(profile) => <EveryoneView profile={profile} />}
      </RequireProfile>
    </Suspense>
  );
}

function EveryoneView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const [people, setPeople] = useState<EnrichedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>("all");

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

  const counts = useMemo(() => countBuckets(people ?? []), [people]);

  // Group by why.nodes Topic — per Figma caption "GET /people · group by why.nodes Topic".
  const clusters = useMemo(
    () => buildClusters(people ?? [], profile.interests),
    [people, profile.interests],
  );

  // Pick a focused person to label the Path-to tab (default top-scored).
  const focusedName = people?.[0]?.name ?? null;

  // Apply category filter to the clusters' people pool.
  const filteredClusters = useMemo(
    () => filterByCategory(clusters, category),
    [clusters, category],
  );

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

        <h1 className="font-serif text-[32px] leading-[1.05] text-ink">
          Everyone at Patch
        </h1>
        <p className="-mt-2 text-[13px] text-muted">
          {people?.length ?? 0} people, grouped by your {profile.interests.length}{" "}
          interests
        </p>

        <PathTabs
          focusName={focusedName}
          active="everyone"
          pathHref="/graph"
          everyoneHref="/everyone"
        />

        {/* Category chips — selected uses tone="gradient" */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip
            label={`All ${counts.all}`}
            value="all"
            active={category === "all"}
            onClick={setCategory}
          />
          <CategoryChip
            label={`Interesting ${counts.interesting}`}
            value="interesting"
            active={category === "interesting"}
            onClick={setCategory}
          />
          <CategoryChip
            label={`Met ${counts.met}`}
            value="met"
            active={category === "met"}
            onClick={setCategory}
          />
          <CategoryChip
            label={`Speakers ${counts.speakers}`}
            value="speakers"
            active={category === "speakers"}
            onClick={setCategory}
          />
        </div>

        {/* Clustered graph canvas */}
        {error ? (
          <div className="flex h-[420px] items-center justify-center rounded-[12px] border border-line bg-card px-5 text-center">
            <p className="text-sm text-alert">{error}</p>
          </div>
        ) : !people ? (
          <div className="flex h-[420px] items-center justify-center rounded-[12px] border border-line bg-card">
            <span className="text-sm text-muted">Loading the room…</span>
          </div>
        ) : (
          <ClusteredGraph clusters={filteredClusters} />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LegendItem swatch={<SpectrumDot />} label="Strong fit" />
          <LegendItem
            swatch={<Image src="/emoji/met.svg" width={16} height={16} alt="Met" />}
            label="Met"
          />
          <LegendItem
            swatch={<Image src="/emoji/warm.svg" width={16} height={16} alt="Warm" />}
            label="Warm"
          />
          <LegendItem
            swatch={<Image src="/emoji/speaker.svg" width={16} height={16} alt="Speaker" />}
            label="Speaker"
          />
          <LegendItem swatch={<NoPathDot />} label="No path" />
        </div>

        <p className="text-[12px] text-muted">
          Size = fit. Tap a topic to expand it, or a person to light their path.
        </p>

        <div className="mt-auto pt-2">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            See as a ranked list
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function CategoryChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: CategoryKey;
  active: boolean;
  onClick: (v: CategoryKey) => void;
}) {
  return (
    <button type="button" onClick={() => onClick(value)}>
      <Chip
        tone={active ? "gradient" : "outline"}
        className={active ? "text-white" : ""}
      >
        {label}
      </Chip>
    </button>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted">
      {swatch}
      {label}
    </span>
  );
}

function SpectrumDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 rounded-full"
      style={{
        backgroundImage:
          "linear-gradient(90deg, #f7d84a 0%, #f2a14b 35%, #ef8474 68%, #ee9bb5 100%)",
      }}
    />
  );
}

function NoPathDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 rounded-full border border-line bg-subtle"
    />
  );
}

function countBuckets(people: PersonCard[]) {
  return {
    all: people.length,
    interesting: people.filter((p) => p.triage === "interesting").length,
    met: people.filter((p) => p.met !== null).length,
    speakers: people.filter((p) => (p.talks ?? []).length > 0).length,
  };
}

function buildClusters(people: PersonCard[], interests: string[]): Cluster[] {
  // Group people by their why.nodes Topic hops, filtered to the user's
  // interests so hubs correspond to the user's goal topics.
  const myInterests = new Set(interests.map((i) => i.toLowerCase()));
  const seedTopics = interests.slice(0, 3);
  const map = new Map<string, PersonCard[]>();
  for (const topic of seedTopics) map.set(topic, []);

  for (const person of people) {
    const topics = person.why?.nodes
      .filter((n) => n.type === "Topic")
      .map((n) => n.label);
    const matchedToMine = (topics ?? []).filter((t) =>
      myInterests.has(t.toLowerCase()),
    );
    for (const t of matchedToMine) {
      // Prefer exact user interest spelling as the hub key.
      const key =
        seedTopics.find((s) => s.toLowerCase() === t.toLowerCase()) ?? t;
      const list = map.get(key) ?? [];
      if (!list.includes(person)) list.push(person);
      map.set(key, list);
    }
  }

  return Array.from(map.entries()).map(([topic, bucket]) => ({
    topic,
    count: bucket.length,
    people: bucket,
  }));
}

function filterByCategory(clusters: Cluster[], category: CategoryKey): Cluster[] {
  if (category === "all") return clusters;
  return clusters.map((cluster) => {
    const filtered = cluster.people.filter((p) => {
      if (category === "interesting") return p.triage === "interesting";
      if (category === "met") return p.met !== null;
      if (category === "speakers") return (p.talks ?? []).length > 0;
      return true;
    });
    return { ...cluster, count: filtered.length, people: filtered };
  });
}
