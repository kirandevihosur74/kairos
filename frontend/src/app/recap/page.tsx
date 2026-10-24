"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  Chip,
  GoalProgress,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

const DAILY_GOAL = 10;
// Hardcoded per spec: show 7 of 10 progress tile.
const HARDCODED_MET = 7;

const CONFERENCE_LABEL = "Patch the Conference";

export default function RecapPage() {
  return (
    <RequireProfile>
      <RecapView />
    </RequireProfile>
  );
}

function RecapView() {
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
    api.listPeople(conferenceId, "interesting").then(
      (people) => {
        if (cancelled) return;
        setState({ kind: "ready", people: enrichMany(people) });
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
    router.push(`/person/${encodeURIComponent(person.id)}`);
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

  const people = state.kind === "ready" ? state.people : [];
  const met = people.filter((p) => p.met !== null);
  const notMet = people.filter((p) => p.met === null);
  const draftsReady = people.filter((p) => p.triage === "interesting").length;

  const metCount = HARDCODED_MET;
  const notMetCount = notMet.length;
  const draftsReadyCount = draftsReady;

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-4 px-5 pt-3">
        <header className="flex flex-col gap-3">
          <p className="text-[12px] tracking-[0.24px] text-muted">
            {CONFERENCE_LABEL} · wrapped
          </p>
          <h1 className="font-serif text-[38px] leading-none tracking-[-0.38px] text-ink">
            You met {metCount} people today.
          </h1>
          <div className="flex flex-col gap-2 pt-1">
            <GoalProgress value={metCount} goal={DAILY_GOAL} />
            <p className="text-[12px] text-muted">
              {metCount} of your goal of {DAILY_GOAL}
            </p>
          </div>
        </header>

        {state.kind === "error" && (
          <Card radius="md" padded>
            <p className="text-sm text-muted">Could not load recap.</p>
          </Card>
        )}

        <section className="grid grid-cols-3 gap-2">
          <StatTile
            emoji="/emoji/met.svg"
            value={metCount}
            label="met"
          />
          <StatTile
            emoji="/emoji/shortlisted.svg"
            value={notMetCount}
            label="didn’t get to"
          />
          <StatTile
            emoji="/emoji/follow-up.svg"
            value={draftsReadyCount}
            label="drafts ready"
          />
        </section>

        {met.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel className="tracking-[0.48px]">
              BEST CONVERSATIONS
            </SectionLabel>
            <Card radius="md" padded={false}>
              <ul className="flex flex-col">
                {met.map((person, index) => {
                  const warm =
                    person.reachability_tag === "warm" ||
                    person.score === 1.0;
                  return (
                    <li
                      key={person.id}
                      className={index === 0 ? "" : "border-t border-line"}
                    >
                      <button
                        type="button"
                        onClick={() => openPerson(person)}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                      >
                        <Avatar
                          name={person.name}
                          src={person.photo_url}
                          size="md"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                          <span className="truncate text-[14px] text-ink">
                            {person.name}
                          </span>
                          <span className="truncate text-[12px] text-muted">
                            {person.met?.text ??
                              person.next_step ??
                              [person.title, person.company]
                                .filter(Boolean)
                                .join(" · ")}
                          </span>
                        </span>
                        {warm ? (
                          <Image
                            src="/emoji/warm.svg"
                            alt=""
                            width={20}
                            height={20}
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        )}

        {notMet.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel className="tracking-[0.48px]">
              YOU DIDN’T GET TO
            </SectionLabel>
            <Card radius="md" padded={false}>
              <ul className="flex flex-col">
                {notMet.map((person, index) => (
                  <li
                    key={person.id}
                    className={index === 0 ? "" : "border-t border-line"}
                  >
                    <div className="flex items-center gap-3 py-2.5 pl-3.5 pr-3">
                      <Avatar
                        name={person.name}
                        src={person.photo_url}
                        size="md"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                        <span className="truncate text-[14px] text-ink">
                          {person.name}
                        </span>
                        {(person.title || person.company) && (
                          <span className="truncate text-[12px] text-muted">
                            {[person.title, person.company]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/drafts/new?person=${encodeURIComponent(
                              person.id,
                            )}&kind=introduction`,
                          )
                        }
                        className="shrink-0"
                        aria-label={`Say hello to ${person.name}`}
                      >
                        <Chip tone="outline" className="!text-[12px]">
                          Say hello
                        </Chip>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {state.kind === "ready" && people.length === 0 && (
          <Card radius="md" padded>
            <p className="text-sm text-muted">
              No one marked interesting yet. Head to Discover to triage your
              shortlist.
            </p>
          </Card>
        )}

        <div className="mt-auto flex flex-col gap-2 pb-2 pt-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/drafts")}
            trailing={<span aria-hidden>→</span>}
          >
            Review {draftsReadyCount} follow-up
            {draftsReadyCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function StatTile({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-card px-3 py-3.5">
      <Image src={emoji} alt="" width={20} height={20} aria-hidden />
      <p className="text-spectrum font-serif text-[30px] leading-none tracking-[-0.3px]">
        {value}
      </p>
      <p className="text-[12px] text-muted">{label}</p>
    </div>
  );
}
