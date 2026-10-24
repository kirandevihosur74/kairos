"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  PhoneShell,
  ReachabilityPill,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api } from "@/lib/api";
import { enrichMany, type EnrichedCard } from "@/lib/data/mocks";
import { useSession } from "@/lib/session";

const DAILY_GOAL = 10;

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
    | { kind: "ready"; people: EnrichedCard[]; drafts: number; eventName: string | null }
    | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    if (!conferenceId) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    Promise.all([
      api.listPeople(conferenceId, "interesting"),
      api.listDrafts(conferenceId),
      api.getConferenceStatus(conferenceId),
    ]).then(
      ([people, drafts, conference]) => {
        if (cancelled) return;
        setState({ kind: "ready", people: enrichMany(people), drafts: drafts.length, eventName: conference.name });
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
  const draftsReady = state.kind === "ready" ? state.drafts : 0;
  const eventName = (state.kind === "ready" && state.eventName) || "Your event";

  const total = people.length;
  const metCount = met.length;
  const progress = Math.min(metCount, DAILY_GOAL);

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-4">
        <header className="flex flex-col gap-3">
          <SectionLabel>{eventName} · wrapped</SectionLabel>
          <h1 className="font-serif text-[38px] leading-[1.02] tracking-[-0.01em] text-ink">
            {headline(metCount, total)}
          </h1>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: DAILY_GOAL }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-[10px] flex-1 rounded-full " +
                    (i < progress ? "bg-spectrum" : "bg-subtle")
                  }
                />
              ))}
            </div>
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

        {state.kind !== "error" && (
          <section className="flex gap-2">
            <StatCard value={metCount} label="met" />
            <StatCard value={notMet.length} label="didn’t get to" />
            <StatCard value={draftsReady} label="drafts ready" />
          </section>
        )}

        {met.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel className="tracking-[0.08em]">
              Best conversations
            </SectionLabel>
            <Card radius="md" padded={false}>
              <ul className="flex flex-col">
                {met.map((person, index) => (
                  <li
                    key={person.id}
                    className={index === 0 ? "" : "border-t border-line"}
                  >
                    <button
                      type="button"
                      onClick={() => openPerson(person)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <Avatar
                        name={person.name}
                        src={person.photo_url}
                        size="lg"
                        strongFit={person.score === 1.0}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[14px] text-ink">
                          {person.name}
                        </span>
                        <span className="truncate text-[12px] text-muted">
                          {person.notes.at(-1)?.text ??
                            person.next_step ??
                            [person.title, person.company]
                              .filter(Boolean)
                              .join(" @ ")}
                        </span>
                      </span>
                      {person.reachability_tag ? (
                        <ReachabilityPill
                          value={person.reachability_tag}
                          size="sm"
                        />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {notMet.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel className="tracking-[0.08em]">
              You didn’t get to
            </SectionLabel>
            <Card radius="md" padded={false}>
              <ul className="flex flex-col">
                {notMet.map((person, index) => (
                  <li
                    key={person.id}
                    className={index === 0 ? "" : "border-t border-line"}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Avatar
                        name={person.name}
                        src={person.photo_url}
                        size="lg"
                        strongFit={person.score === 1.0}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
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
                      {person.reachability_tag ? (
                        <ReachabilityPill
                          value={person.reachability_tag}
                          size="sm"
                        />
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openPerson(person)}
                      >
                        Say hello
                      </Button>
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

        <div className="mt-2 flex flex-col gap-2">
          {draftsReady > 0 && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => router.push("/drafts")}
              trailing={<span aria-hidden>→</span>}
            >
              Review {draftsReady} follow-up{draftsReady === 1 ? "" : "s"}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            Back to discover
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card radius="md" padded={false} className="flex-1">
      <div className="flex flex-col gap-1 px-3 py-3.5">
        <p className="font-serif text-[30px] leading-none tracking-[-0.01em] text-ink">
          {value}
        </p>
        <p className="text-[12px] text-muted">{label}</p>
      </div>
    </Card>
  );
}

function headline(met: number, total: number): string {
  if (met === 0 && total === 0) {
    return "No one met yet.";
  }
  if (met === 0) {
    return `${total} shortlisted — go say hi.`;
  }
  const noun = met === 1 ? "person" : "people";
  return `You met ${met} ${noun} today.`;
}
