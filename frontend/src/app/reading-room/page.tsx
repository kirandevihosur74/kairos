"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  AppNav,
  Button,
  Card,
  MiniProgress,
  PhoneShell,
  SectionLabel,
  Wordmark,
} from "@/components";
import { enrichmentFor } from "@/lib/data/mocks";

type SourceStage = "done" | "streaming" | "queued";

interface SourceRow {
  label: string;
  detail: string;
  timestamp: string;
  stage: SourceStage;
}

const SOURCES: SourceRow[] = [
  {
    label: "Judges page",
    detail: "wemakedevs.org · 9 people",
    timestamp: "12:14:03",
    stage: "done",
  },
  {
    label: "Speakers and sponsors",
    detail: "session pages · 22",
    timestamp: "12:14:41",
    stage: "done",
  },
  {
    label: "Luma guest list",
    detail: "17 of ~40 · streaming",
    timestamp: "now",
    stage: "streaming",
  },
  {
    label: "LinkedIn profiles",
    detail: "24 of 48 · matching faces",
    timestamp: "now",
    stage: "streaming",
  },
  {
    label: "Hiring signals",
    detail: "company pages and search · queued",
    timestamp: "",
    stage: "queued",
  },
];

const FIRST_CARDS: Array<{ id: string; name: string }> = [
  { id: "fixture_p_1", name: "Alex Morgan" },
  { id: "fixture_p_2", name: "Taylor Chen" },
  { id: "fixture_p_4", name: "Jordan Lee" },
];

function TileAvatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  const initials = (() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  })();
  return (
    <span className="relative inline-flex h-16 w-16 rounded-full bg-spectrum p-[2px]">
      <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-paper p-[2px]">
        {src ? (
          <Image
            src={src}
            alt={name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span
            aria-label={name}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cream text-[18px] font-serif text-ink leading-none select-none"
          >
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}

function StageIcon({ stage }: { stage: SourceStage }) {
  if (stage === "done") {
    return (
      <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <Image
          src="/emoji/checkc.svg"
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px]"
        />
      </span>
    );
  }
  if (stage === "streaming") {
    return (
      <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <Image
          src="/emoji/loader.svg"
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] animate-pulse"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-[1px] inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-line"
    />
  );
}

export default function ReadingRoomPage() {
  return (
    <Suspense
      fallback={
        <PhoneShell>
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-muted">Loading…</span>
          </div>
        </PhoneShell>
      }
    >
      <ReadingRoomView />
    </Suspense>
  );
}

function ReadingRoomView() {
  const router = useRouter();

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2">
        <div className="flex items-center">
          <Wordmark size="sm" />
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-ink">
            Reading the room…
          </h1>
          <p className="text-[13px] text-muted">
            Patch the Conference · collecting live through Bright Data
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <MiniProgress value={0.62} height={6} className="flex-1" />
            <span className="text-[13px] font-semibold text-ink">62%</span>
          </div>
        </section>

        <Card tone="plain" radius="md" padded={false}>
          <ul className="flex flex-col">
            {SOURCES.map((source, index) => (
              <li
                key={source.label}
                className={
                  "flex items-start gap-3 px-4 py-3 " +
                  (index === 0 ? "" : "border-t border-line")
                }
              >
                <StageIcon stage={source.stage} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={
                      "text-[14px] font-semibold leading-tight " +
                      (source.stage === "queued" ? "text-muted" : "text-ink")
                    }
                  >
                    {source.label}
                  </p>
                  <p className="text-[12px] leading-tight text-muted">
                    {source.detail}
                  </p>
                </div>
                {source.timestamp ? (
                  <span
                    className={
                      "shrink-0 text-[11px] font-medium leading-none pt-[2px] " +
                      (source.stage === "streaming"
                        ? "text-alert"
                        : "text-muted")
                    }
                  >
                    {source.timestamp}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-3">
          <SectionLabel className="tracking-[0.04em]">
            FIRST CARDS READY · 12
          </SectionLabel>
          <div className="flex gap-3">
            {FIRST_CARDS.map((card) => {
              const enrichment = enrichmentFor(card.id);
              return (
                <div
                  key={card.id}
                  className="flex h-[132px] w-[110px] flex-col items-center justify-start gap-2 rounded-[10px] border border-line bg-card p-2 pt-3"
                >
                  <TileAvatar
                    name={card.name}
                    src={enrichment.photo_url ?? null}
                  />
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <p className="text-center text-[12px] font-semibold leading-tight text-ink">
                      {card.name}
                    </p>
                    <p className="text-center text-[11px] leading-tight text-muted">
                      just found
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[12px] leading-[1.45] text-muted">
          Every fact keeps its source and the time it was collected.
        </p>

        <div className="pb-6 pt-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/discover")}
          >
            Start sorting the first 12 →
          </Button>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}
