"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type Profile } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";
import { ClusteredGraph } from "../../everyone/_components/ClusteredGraph";

function TopicPageRoute() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  if (!slug) return null;
  return (
    <RequireProfile>
      {(profile) => <TopicView profile={profile} slug={slug} />}
    </RequireProfile>
  );
}

export default function TopicPage() {
  return (
    <Suspense fallback={null}>
      <TopicPageRoute />
    </Suspense>
  );
}

function TopicView({ profile, slug }: { profile: Profile; slug: string }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const [people, setPeople] = useState<EnrichedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topicLabel = useMemo(
    () => resolveTopicLabel(slug, profile.interests),
    [slug, profile.interests],
  );

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

  // Client-side filter of /people by topic — per Figma caption on 7.2.
  const filtered = useMemo(() => {
    if (!people) return [];
    const lower = topicLabel.toLowerCase();
    return people.filter((p) => {
      const theirs = (p.topics ?? []).map((t) => t.toLowerCase());
      const whyTopics = (p.why?.nodes ?? [])
        .filter((n) => n.type === "Topic")
        .map((n) => n.label.toLowerCase());
      return theirs.includes(lower) || whyTopics.includes(lower);
    });
  }, [people, topicLabel]);

  const cluster = useMemo(
    () => [
      {
        topic: topicLabel,
        count: filtered.length,
        people: filtered,
      },
    ],
    [filtered, topicLabel],
  );

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-10 pt-2">
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push("/everyone")}
            className="text-[14px] font-medium text-ink hover:underline"
          >
            ‹ Everyone
          </button>
        </div>

        <h1 className="font-serif text-[34px] leading-[1.05] lowercase text-ink">
          {topicLabel}
        </h1>
        <p className="-mt-2 text-[13px] text-muted">
          {filtered.length} people here share it with you
        </p>

        {/* Focused cluster graph */}
        {error ? (
          <div className="flex h-[250px] items-center justify-center rounded-[12px] border border-line bg-card px-5 text-center">
            <p className="text-sm text-alert">{error}</p>
          </div>
        ) : !people ? (
          <div className="flex h-[250px] items-center justify-center rounded-[12px] border border-line bg-card">
            <span className="text-sm text-muted">Loading…</span>
          </div>
        ) : (
          <ClusteredGraph clusters={cluster} perTopicMax={4} />
        )}

        {/* RANKED · topic */}
        <SectionLabel className="pt-2 uppercase">
          RANKED · {topicLabel}
        </SectionLabel>

        <Card radius="md" padded={false} className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="text-sm text-muted">
                No one at this event shares this topic yet.
              </span>
            </div>
          ) : (
            <ul>
              {filtered.map((person, idx) => (
                <li
                  key={person.id}
                  className={idx > 0 ? "border-t border-line" : ""}
                >
                  <TopicRow person={person} totalInterests={profile.interests.length} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="text-[12px] text-muted">
          Illustrative at scale. Today&rsquo;s fixtures have {people?.length ?? 0}{" "}
          people.
        </p>

        <div className="mt-auto pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            Sort these {filtered.length} &nbsp;→
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function TopicRow({
  person,
  totalInterests,
}: {
  person: EnrichedCard;
  totalInterests: number;
}) {
  const met = person.met !== null;
  const warm = (person.reachability ?? "").toLowerCase() === "warm";
  const speaker = (person.talks ?? []).length > 0;
  const glyph: { src: string; alt: string } | null = met
    ? { src: "/emoji/met.svg", alt: "Met" }
    : warm
      ? { src: "/emoji/warm.svg", alt: "Warm" }
      : speaker
        ? { src: "/emoji/speaker.svg", alt: "Speaker" }
        : null;
  const matched = 0;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="relative shrink-0">
        <Avatar
          name={person.name}
          src={person.photo_url}
          size="lg"
          strongFit={person.score === 1.0}
        />
        {glyph ? (
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card"
            style={{ boxShadow: "0 0 0 1px #e9e9e7" }}
          >
            <Image src={glyph.src} alt={glyph.alt} width={14} height={14} />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-ink">
          {person.name}
        </span>
        <span className="truncate text-[12px] text-muted">
          {person.title ?? person.company ?? "—"}
        </span>
      </div>
      <span className="shrink-0 pt-1 text-[13px] font-medium text-ink">
        {(person.why?.nodes.filter((n) => n.type === "Topic").length ?? matched)}{" "}
        of {totalInterests || 1}
      </span>
    </div>
  );
}

function resolveTopicLabel(slug: string, interests: string[]): string {
  const normalized = slug.toLowerCase();
  for (const interest of interests) {
    const s = interest.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (s === normalized) return interest;
  }
  // Fall back to a de-slugged version.
  return decodeURIComponent(slug).replace(/-/g, " ");
}
