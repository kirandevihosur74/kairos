"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Card,
  Chip,
  Logo,
  PhoneShell,
  RequireProfile,
} from "@/components";
import { ApiError, api, type Profile } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

export default function TodayPage() {
  return (
    <RequireProfile>
      {(profile) => <TodayView profile={profile} />}
    </RequireProfile>
  );
}

function TodayView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; people: EnrichedCard[] }
    | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    if (!conferenceId) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    api.priorities(conferenceId).then(
      (people) => {
        if (cancelled) return;
        setState({
          kind: "ready",
          people: enrichMany(people.slice(0, 3)),
        });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, router]);

  function openPerson(person: EnrichedCard) {
    setCurrentPersonId(person.id);
    router.push(`/person/${encodeURIComponent(person.id)}/glance`);
  }

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

  // Right-now session comes from any priority person with session_slot set
  // (mock enrichment: fixture_p_1 Alex Morgan, fixture_p_4 Taylor Chen).
  const rightNow =
    state.kind === "ready"
      ? state.people.find((p) => p.session_slot) ?? null
      : null;

  return (
    <PhoneShell>
      <div className="flex flex-col gap-[14px] px-4 pb-6 pt-1">
        <TopBar profile={profile} />

        <LiveNowHero />

        <p className="text-[15px] text-ink">Right now</p>

        {rightNow && rightNow.session_slot ? (
          <RightNowCard person={rightNow} />
        ) : (
          <RightNowFallback />
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[15px] text-ink">Your top 3</p>
          <Link
            href="/discover"
            className="text-[13px] font-medium text-alert"
          >
            See all
          </Link>
        </div>

        {state.kind === "loading" && (
          <Card radius="md" padded>
            <p className="text-sm text-muted">Loading your priorities…</p>
          </Card>
        )}

        {state.kind === "error" && (
          <Card radius="md" padded>
            <p className="text-sm text-muted">Could not load priorities.</p>
          </Card>
        )}

        {state.kind === "ready" && state.people.length === 0 && (
          <Card radius="md" padded>
            <p className="text-sm text-muted">
              No priorities yet. Review your shortlist in Discover.
            </p>
          </Card>
        )}

        {state.kind === "ready" && state.people.length > 0 && (
          <Card radius="md" padded={false}>
            <ul className="flex flex-col">
              {state.people.map((person, index) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => openPerson(person)}
                    className="flex w-full items-center gap-3 pl-[14px] pr-[12px] py-[12px] text-left"
                  >
                    <span className="w-4 shrink-0 text-[15px] text-alert">
                      {index + 1}
                    </span>
                    <Avatar
                      name={person.name}
                      src={person.photo_url}
                      size="lg"
                      strongFit={person.score === 1.0}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="flex items-center gap-[6px]">
                        <span className="truncate text-[14px] text-ink">
                          {person.name}
                        </span>
                        {person.met ? <MetChip /> : <NotMetChip />}
                      </span>
                      <span className="truncate text-[12px] text-muted">
                        {nextStepLine(person)}
                      </span>
                    </span>
                    <ChevRight />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function TopBar({ profile }: { profile: Profile }) {
  const initials = toInitials(profile.name);
  return (
    <div className="flex items-center justify-between pb-[12px] pt-[4px]">
      <div className="flex items-center gap-[7px]">
        <Logo size={20} />
        <span className="font-serif text-[23px] tracking-[-0.01em] leading-none text-ink">
          kairos
        </span>
      </div>
      <div className="flex items-center gap-[14px]">
        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex h-[22px] w-[22px] items-center justify-center text-ink"
        >
          <BellIcon />
        </button>
        <span
          aria-label={profile.name}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-subtle text-[12px] text-ink select-none"
        >
          {initials}
        </span>
      </div>
    </div>
  );
}

function LiveNowHero() {
  return (
    <Card
      radius="md"
      padded
      className="flex flex-col gap-[6px] bg-ink text-white"
    >
      <span className="inline-flex items-center gap-[6px] self-start rounded-full bg-white/15 px-[10px] py-[4px] text-[11px] text-white">
        <span
          aria-hidden
          className="inline-block h-[7px] w-[7px] rounded-full bg-alert"
        />
        Live now
      </span>
      <p className="font-serif text-[22px] tracking-[-0.01em] leading-tight text-white">
        Patch the Conference
      </p>
      <p className="text-[13px] text-white/80">
        Bright Data SF · until 7 PM · 6 shortlisted
      </p>
    </Card>
  );
}

function RightNowCard({ person }: { person: EnrichedCard }) {
  const slot = person.session_slot!;
  const firstLine = `${slot.time}${slot.stage ? ` · ${slot.stage}` : ""}`;
  const title = slot.title ?? "Session";
  const body = `${person.name.split(" ")[0]} is speaking. Catch ${isFemalish(person.name) ? "her" : "them"} after.`;
  return (
    <div className="flex w-full items-center gap-3 rounded-[12px] bg-cream p-[14px]">
      <Avatar
        name={person.name}
        src={person.photo_url}
        size="lg"
        className="rounded-[12px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-[5px]">
          <Image
            src="/emoji/clock.svg"
            alt=""
            width={13}
            height={13}
            aria-hidden
          />
          <span className="text-[12px] text-alert">{firstLine}</span>
        </span>
        <p className="font-serif text-[18px] leading-tight text-ink">
          {title}
        </p>
        <p className="text-[12px] text-ink/70">{body}</p>
      </div>
    </div>
  );
}

function RightNowFallback() {
  return (
    <div className="flex w-full items-center gap-3 rounded-[12px] bg-cream p-[14px]">
      <div className="h-12 w-12 shrink-0 rounded-[12px] bg-paper/40" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[12px] text-alert">No session right now</span>
        <p className="font-serif text-[18px] leading-tight text-ink">
          Open floor
        </p>
        <p className="text-[12px] text-ink/70">
          Nothing scheduled. Head to Discover to find who&rsquo;s nearby.
        </p>
      </div>
    </div>
  );
}

function MetChip() {
  return (
    <Chip tone="cream" className="px-[10px] py-px text-[10px]">
      <Image
        src="/emoji/met.svg"
        alt=""
        width={14}
        height={14}
        aria-hidden
      />
      Met
    </Chip>
  );
}

function NotMetChip() {
  return (
    <Chip tone="neutral" className="px-[10px] py-px text-[10px] text-muted">
      Not met
    </Chip>
  );
}

function ChevRight() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0 text-faint"
      aria-hidden
    >
      <path d="M7 4l5 5-5 5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M11 3.5a5 5 0 0 0-5 5v2.3c0 .9-.3 1.7-.9 2.3L4 14.2h14l-1.1-1.1a3.3 3.3 0 0 1-.9-2.3V8.5a5 5 0 0 0-5-5z" />
      <path d="M9.5 17.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function nextStepLine(person: EnrichedCard): string {
  if (person.next_step) return person.next_step;
  if (person.why?.sentence) return person.why.sentence;
  return "Review their profile";
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Rough mock-only pronoun pick for the "catch her after" copy.
function isFemalish(name: string): boolean {
  const first = name.split(" ")[0]?.toLowerCase() ?? "";
  return [
    "maya",
    "sana",
    "priya",
    "alex",
    "taylor",
    "jamie",
    "sam",
  ].includes(first);
}
