"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function TodayPage() {
  return (
    <RequireProfile>
      <TodayView />
    </RequireProfile>
  );
}

function TodayView() {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; people: PersonCard[] }
    | { kind: "error" }
  >({ kind: "loading" });
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.getConferenceStatus(conferenceId).then(
      (c) => {
        if (!cancelled) setEventName(c.name);
      },
      () => {
        // The name is a label only; priorities still load without it.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId]);

  useEffect(() => {
    if (!conferenceId) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    api.priorities(conferenceId).then(
      (people) => {
        if (cancelled) return;
        setState({ kind: "ready", people: people.slice(0, 3) });
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

  function openPerson(person: PersonCard) {
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

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-10 pt-4">
        <header className="flex flex-col gap-2 px-2">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>{eventName ? `Today · ${eventName}` : "Today"}</SectionLabel>
            <Link href="/onboarding" className="shrink-0 text-[13px] font-medium text-muted">
              Edit profile
            </Link>
          </div>
          <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-ink">
            Who to find first.
          </h1>
          <p className="text-sm text-muted">
            Your top three priorities from the shortlist. Tap a row to open the
            person.
          </p>
        </header>

        <Button variant="secondary" size="md" fullWidth onClick={() => router.push("/events")}>
          Other events
        </Button>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <p className="text-[15px] text-ink">Your top 3</p>
            <Link
              href="/discover"
              className="text-[13px] font-medium text-alert"
            >
              See all
            </Link>
          </div>

          {state.kind === "loading" && (
            <Card radius="lg" padded>
              <p className="text-sm text-muted">Loading your priorities…</p>
            </Card>
          )}

          {state.kind === "error" && (
            <Card radius="lg" padded>
              <p className="text-sm text-muted">Could not load priorities.</p>
            </Card>
          )}

          {state.kind === "ready" && state.people.length === 0 && (
            <Card radius="lg" padded>
              <p className="text-sm text-muted">
                No priorities yet. Review your shortlist in Discover.
              </p>
            </Card>
          )}

          {state.kind === "ready" && state.people.length > 0 && (
            <Card radius="lg" padded={false}>
              <ul className="flex flex-col">
                {state.people.map((person, index) => (
                  <li
                    key={person.id}
                    className={
                      index === 0 ? "" : "border-t border-line"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => openPerson(person)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="w-4 shrink-0 text-[15px] text-alert">
                        {index + 1}
                      </span>
                      <Avatar
                        name={person.name}
                        src={person.photo_url}
                        size="lg"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[14px] text-ink">
                          {person.name}
                        </span>
                        {(person.title || person.company) && (
                          <span className="truncate text-[12px] text-muted">
                            {[person.title, person.company]
                              .filter(Boolean)
                              .join(" @ ")}
                          </span>
                        )}
                        {whyLine(person) && (
                          <span className="truncate text-[12px] text-muted">
                            {whyLine(person)}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        className="shrink-0 text-[18px] leading-none text-faint"
                      >
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <div className="flex flex-col gap-2 px-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            Open discover
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.push("/recap")}
          >
            See today&apos;s recap
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function whyLine(person: PersonCard): string | null {
  if (person.next_step) return person.next_step;
  if (person.why?.sentence) return person.why.sentence;
  return null;
}
