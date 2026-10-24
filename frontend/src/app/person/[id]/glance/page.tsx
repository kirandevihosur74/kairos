"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Button,
  Card,
  FactList,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api } from "@/lib/api";
import { enrich, type EnrichedCard } from "@/lib/data/mocks";
import { REACHABILITY_META } from "@/lib/data/types";
import { useSession } from "@/lib/session";

function GlanceRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <RequireProfile>
      <GlanceInner id={id} />
    </RequireProfile>
  );
}

export default function GlancePage() {
  return (
    <Suspense fallback={null}>
      <GlanceRoute />
    </Suspense>
  );
}

function GlanceInner({ id }: { id: string }) {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const [person, setPerson] = useState<EnrichedCard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setCurrentPersonId(id);
  }, [id, setCurrentPersonId]);

  useEffect(() => {
    if (conferenceId === null) {
      router.replace("/event");
      return;
    }
    let cancelled = false;
    api.getPerson(id, conferenceId).then(
      (p) => {
        if (cancelled) return;
        setPerson(enrich(p));
        setStatus("ready");
      },
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setStatus("error");
        else setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, conferenceId, router]);

  if (conferenceId === null || status === "loading") {
    return (
      <PhoneShell withNavSpacer={false}>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Loading…</span>
        </div>
      </PhoneShell>
    );
  }

  if (status === "error" || !person) {
    return (
      <PhoneShell withNavSpacer={false}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 px-8 text-center">
          <p className="text-sm text-alert">Could not load this person.</p>
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </PhoneShell>
    );
  }

  const subtitle = [person.title, person.company].filter(Boolean).join(" · ");
  const opener = person.openers_mock[0] ?? person.openers[0] ?? null;
  const slot = person.session_slot;
  const reachability = person.reachability_tag;
  const firstName = person.name.split(" ")[0] ?? person.name;

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col bg-paper">
        {/* Portrait hero */}
        <section className="relative h-[430px] w-full overflow-hidden">
          {person.photo_url ? (
            <Image
              src={person.photo_url}
              alt={person.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-[#2b2a26] to-[#14120f]" />
          )}
          {/* Dark fade overlay bottom */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px]"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(20,18,15,0.75) 100%)",
            }}
          />

          {/* Counter + Close */}
          <div className="absolute left-5 top-[52px]">
            <span className="inline-flex items-center rounded-full bg-white px-[10px] py-[4px] text-[12px] text-ink">
              1 of 3 to meet
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => router.push("/today")}
            className="absolute right-5 top-[52px] inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/90 text-ink"
          >
            <CloseIcon />
          </button>

          {/* Bottom overlay content */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[6px] px-5 pb-5">
            <div className="flex flex-wrap items-start gap-[6px]">
              {slot ? (
                <span className="inline-flex items-center gap-[6px] rounded-full bg-white px-[10px] py-[4px] text-[12px] text-ink">
                  <Image
                    src="/emoji/speaker.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden
                  />
                  On stage {slot.time}
                  {slot.stage ? ` · ${slot.stage}` : ""}
                </span>
              ) : null}
              {reachability ? (
                <ReachabilityPillLight value={reachability} />
              ) : null}
            </div>
            <h1 className="font-serif text-[40px] leading-[1.02] tracking-[-0.01em] text-white">
              {person.name}
            </h1>
            {subtitle ? (
              <p className="text-[14px] text-white/90">{subtitle}</p>
            ) : null}
          </div>
        </section>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-[12px] px-5 pt-4">
          {opener ? (
            <Card radius="md" padded tone="attention" className="flex flex-col gap-[6px]">
              <SectionLabel className="tracking-[0.08em]">SAY</SectionLabel>
              <p className="font-serif text-[22px] leading-[1.18] tracking-[-0.01em] text-ink">
                &ldquo;{opener}&rdquo;
              </p>
            </Card>
          ) : null}

          {person.three_facts.length > 0 ? (
            <div className="flex flex-col gap-[10px]">
              <SectionLabel className="tracking-[0.08em]">
                THREE THINGS ABOUT {firstName.toUpperCase()}
              </SectionLabel>
              <FactList facts={person.three_facts} />
              {person.warm_intro_hint ? (
                <div className="flex items-start gap-[6px] pt-1 text-[13px]">
                  <span className="text-muted">Mention</span>
                  <span className="text-ink">
                    {person.warm_intro_hint.connector}
                    {person.warm_intro_hint.via
                      ? `, your connection at ${person.warm_intro_hint.via}`
                      : null}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex-1" />

          {/* Bottom actions */}
          <div className="flex gap-[10px] pb-[34px] pt-[12px]">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => router.push("/today")}
              className="rounded-full border-ink/0 bg-card"
            >
              Next person
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setCurrentPersonId(person.id);
                router.push(
                  `/person/${encodeURIComponent(person.id)}/note`,
                );
              }}
              leading={
                <Image
                  src="/emoji/met.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden
                />
              }
            >
              I met {firstName}
            </Button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  );
}

/**
 * Inline white-tonal reachability pill. The shared ReachabilityPill component
 * only supports a card background; the Figma glance frame uses a white chip
 * floating over the hero image. Noted in PR body as a shared-infra gap.
 */
function ReachabilityPillLight({
  value,
}: {
  value: keyof typeof REACHABILITY_META;
}) {
  const meta = REACHABILITY_META[value];
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full bg-white/90 px-[10px] py-[4px] text-[12px] text-ink">
      <Image
        src={`/emoji/${meta.emoji}.svg`}
        alt=""
        width={14}
        height={14}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

