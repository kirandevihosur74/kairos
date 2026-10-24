"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  PhoneShell,
  useToast,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";

// ---------------------------------------------------------------------------
// Local inline type: Reason (not yet in @/lib/data/types).
// Backend TODO: add `reasons: Reason[]` to GET /people/{id} so this does not
// have to be mocked client-side.
// ---------------------------------------------------------------------------
interface Reason {
  label: string;
  sub: string;
  sourceUrl: string;
  collectedAt: string;
}

function reasonsFor(card: PersonCard | null): Reason[] {
  const name = card?.name?.split(" ")[0] ?? "them";
  // Mocked locally. Real reasons would come from GET /people/{id}.reasons[].
  return [
    {
      label: "Listed as a judge",
      sub: `Public event page · ${name}'s talk`,
      sourceUrl: "wemakedevs.org/hackathons/ptc/judges",
      collectedAt: "12:14",
    },
    {
      label: "Shares 2 of your interests",
      sub: "python, distributed systems",
      sourceUrl: "linkedin.com · talk page",
      collectedAt: "12:14",
    },
    {
      label: "Connected through Priya Shah",
      sub: "1st-degree connection",
      sourceUrl: "your LinkedIn export",
      collectedAt: "11:02",
    },
  ];
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function WhyPageInner({ id }: { id: string }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const { showToast } = useToast();
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!conferenceId) {
      // No live conference; mark "ready" with no person. The sheet renders
      // with fallback copy. Deferred to a microtask so the state update
      // happens outside the effect body (avoids cascading renders).
      queueMicrotask(() => setStatus("ready"));
      return;
    }
    let cancelled = false;
    api.getPerson(id, conferenceId).then(
      (p) => {
        if (cancelled) return;
        setPerson(p);
        setStatus("ready");
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setStatus("error");
        } else {
          setStatus("error");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, conferenceId]);

  const firstName = useMemo(() => {
    if (!person) return "them";
    return person.name.split(" ")[0] ?? person.name;
  }, [person]);

  const reasons = useMemo(() => reasonsFor(person), [person]);

  const handleClose = () => {
    router.back();
  };

  return (
    <PhoneShell withNavSpacer={false}>
      {/* Dim backdrop fills behind the sheet. Tap to dismiss. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleClose}
        className="absolute inset-0 z-0 bg-ink/40"
      />

      {/* Bottom-sheet surface */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <div className="pointer-events-auto w-full max-w-[430px] rounded-t-[20px] border border-line bg-card shadow-[0_-8px_24px_rgba(55,53,47,0.08)]">
          <div className="relative px-5 pt-3 pb-6">
            {/* Grab handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

            {/* Close button, top right */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-subtle"
            >
              <CloseIcon />
            </button>

            <h1 className="pr-10 font-serif text-[28px] leading-tight text-ink">
              Why you&rsquo;re seeing {firstName}
            </h1>

            {/* Reasons */}
            <ul className="mt-6 flex flex-col gap-6">
              {reasons.map((r) => (
                <li
                  key={r.label}
                  className="relative pl-6"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[7px] inline-block h-2.5 w-2.5 rounded-full bg-ink"
                  />
                  <p className="text-[15px] font-semibold text-ink">
                    {r.label}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">
                    {r.sub}
                    <br />
                    <span className="break-all">
                      {r.sourceUrl} · collected {r.collectedAt}
                    </span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Cream attention banner */}
            <Card tone="attention" radius="md" className="mt-6">
              <p className="text-[13px] font-medium leading-snug text-ink">
                We only use what people publish about their work. No personal
                social media.
              </p>
            </Card>

            {/* Secondary buttons side-by-side */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => router.push(`/hide/${id}`)}
              >
                Hide {firstName}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() =>
                  showToast("Thanks — we’ll review.")
                }
              >
                Report wrong info
              </Button>
            </div>

            {status === "error" ? (
              <p className="mt-4 text-center text-[11px] text-muted">
                Showing sample reasons — couldn&rsquo;t reach the live profile.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function WhyPageRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return <WhyPageInner id={id} />;
}

export default function WhyPage() {
  return (
    <Suspense fallback={null}>
      <WhyPageRoute />
    </Suspense>
  );
}
