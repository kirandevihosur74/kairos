"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  Chip,
  PhoneShell,
  SectionLabel,
  Wordmark,
} from "@/components";
import { enrichmentFor } from "@/lib/data/mocks";

interface AnswerRow {
  id: string;
  name: string;
  detail: string;
  emoji: string;
  strongFit: boolean;
}

const ANSWERS: AnswerRow[] = [
  {
    id: "fixture_p_1",
    name: "Alex Morgan",
    detail: "via Priya · Example Build Co is hiring platform engineers",
    emoji: "/emoji/warm.svg",
    strongFit: true,
  },
  {
    id: "fixture_p_2",
    name: "Taylor Chen",
    detail: "met twice · their team posted a platform role Monday",
    emoji: "/emoji/met.svg",
    strongFit: false,
  },
  {
    id: "fixture_p_4",
    name: "Jordan Lee",
    detail: "speaker · manages the platform team at Example Data Co",
    emoji: "/emoji/speaker.svg",
    strongFit: true,
  },
];

function SendGlyph() {
  return (
    <span
      aria-hidden
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-spectrum text-ink"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10l14-7-5 14-2-6-7-1z" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function AskPage() {
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
      <AskView />
    </Suspense>
  );
}

function AskView() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-40 pt-2">
        <div className="flex items-center justify-between">
          <Wordmark size="sm" />
          <Chip tone="outline">Memory · 14 notes</Chip>
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-ink">
            Ask your graph
          </h1>
        </header>

        <div className="flex justify-end">
          <div className="max-w-[274px] rounded-[10px] bg-ink px-4 py-3 text-[14px] leading-[1.4] text-white">
            Who here could refer me to a platform role?
          </div>
        </div>

        <Card tone="plain" radius="lg" padded>
          <div className="flex flex-col gap-3">
            <SectionLabel>3 PEOPLE, BY PATH STRENGTH</SectionLabel>
            <ul className="flex flex-col gap-4">
              {ANSWERS.map((row) => {
                const enrichment = enrichmentFor(row.id);
                return (
                  <li key={row.id} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar
                        name={row.name}
                        src={enrichment.photo_url ?? null}
                        size="lg"
                        strongFit={row.strongFit}
                      />
                      <span className="absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center">
                        <Image
                          src={row.emoji}
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px]"
                        />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-[14px] font-semibold leading-tight text-ink">
                        {row.name}
                      </p>
                      <p className="text-[12px] leading-[1.4] text-muted">
                        {row.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Chip tone="outline" className="text-[11px]">
                3-hop query · 38 ms
              </Chip>
              <Chip tone="outline" className="text-[11px]">
                9 sources
              </Chip>
              <Chip tone="outline" className="text-[11px]">
                From 2 events
              </Chip>
            </div>
          </div>
        </Card>

        <p className="text-[12px] leading-[1.45] text-muted">
          The same graph answers in Claude or ChatGPT over MCP.
        </p>

        <div className="pt-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push("/drafts")}
          >
            Draft 3 referral asks
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setDraft("");
          }}
          className="pointer-events-auto flex w-full max-w-[350px] items-center gap-2 rounded-full border border-line bg-card py-2 pl-5 pr-2 shadow-sm"
        >
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about anyone you've met…"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
            aria-label="Ask about anyone you've met"
          />
          <button
            type="submit"
            aria-label="Send"
            className="inline-flex shrink-0 items-center justify-center"
          >
            <SendGlyph />
          </button>
        </form>
      </div>

      <AppNav />
    </PhoneShell>
  );
}
