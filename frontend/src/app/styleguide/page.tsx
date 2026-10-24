"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Avatar,
  BottomNav,
  Button,
  Card,
  Chip,
  GoalProgress,
  Logo,
  MiniProgress,
  PhoneShell,
  SectionLabel,
  WaveformProgress,
  Wordmark,
  useToast,
  type NavKey,
} from "@/components";

export default function StyleguidePage() {
  const [nav, setNav] = useState<NavKey>("today");
  const { showToast } = useToast();

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-8 px-6 pb-10 pt-4">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Styleguide v2</SectionLabel>
            <Logo />
          </div>
          <h1 className="font-sans text-3xl font-semibold leading-tight text-ink">
            Kairos foundation
          </h1>
          <p className="text-sm text-muted">
            Modern pass: tonal fills, borderless cards where it reads cleanest,
            serif reserved for names, quotes, and narrative hero titles.
          </p>
        </header>

        <Section title="Palette">
          <div className="grid grid-cols-3 gap-2">
            <Swatch name="paper" value="#FBFBFA" className="bg-paper border border-line" />
            <Swatch name="card" value="#FFFFFF" className="bg-card border border-line" />
            <Swatch name="subtle" value="#F1F1EF" className="bg-subtle" />
            <Swatch name="line" value="#E9E9E7" className="bg-line" />
            <Swatch name="ink" value="#37352F" className="bg-ink" />
            <Swatch name="muted" value="#787774" className="bg-muted" />
            <Swatch name="faint" value="#9B9A97" className="bg-faint" />
            <Swatch name="cream" value="#FBF3DB" className="bg-cream" />
            <Swatch name="alert" value="#C2493A" className="bg-alert" />
            <Swatch name="amber" value="#D67D00" className="bg-amber" />
          </div>
          <div className="mt-3 h-10 w-full rounded-full bg-spectrum" />
          <p className="mt-2 text-xs text-faint">
            Spectrum used only for: progress bars, mic FAB, strong-fit avatar
            rings, in-common markers, distinction chips, and hero fit-score
            text. Never on buttons.
          </p>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-2">
            <p className="font-serif text-5xl leading-none text-ink">
              Who&apos;s in the room?
            </p>
            <p className="text-xs text-faint">Serif — narrative hero title.</p>
            <p className="text-2xl font-sans font-semibold text-ink">
              Your data
            </p>
            <p className="text-xs text-faint">Sans — utility screen title.</p>
            <p className="font-serif text-xl text-ink">Alex Morgan</p>
            <p className="text-xs text-faint">
              Serif reserved for people names + quotes.
            </p>
            <p className="text-base text-ink">
              Body copy sits in Instrument Sans at 16.
            </p>
            <p className="font-mono text-xs text-code-fg bg-code rounded-[8px] px-2 py-1 inline-block">
              MATCH (u:User)-[:HAS_GOAL]-&gt;(:Goal)
            </p>
            <p className="text-xs text-faint">Geist Mono for Cypher blocks.</p>
            <SectionLabel>Section label</SectionLabel>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" fullWidth>
              Primary ink pill
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary">Secondary tonal</Button>
              <Button variant="outline">Outline ink</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="secondary" size="md">
                Medium
              </Button>
              <Button variant="secondary" size="lg">
                Large
              </Button>
            </div>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <p className="mt-2 text-xs text-faint">
            Default secondary is tonal subtle (no border). Outline is the
            bordered-ink variant for destructive/editorial actions.
          </p>
        </Section>

        <Section title="Progress">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-faint mb-1">
                Mini progress — 62% of ingest.
              </p>
              <MiniProgress value={0.62} />
            </div>
            <div>
              <p className="text-xs text-faint mb-1">
                Goal progress — 7 of your goal of 10.
              </p>
              <GoalProgress value={7} goal={10} />
            </div>
            <div>
              <p className="text-xs text-faint mb-1">
                Waveform — 55% through a recording.
              </p>
              <WaveformProgress progress={0.55} />
            </div>
          </div>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2">
            <Chip tone="outline">Sample data</Chip>
            <Chip tone="outline">You</Chip>
            <Chip tone="outline">→ Backend engineer</Chip>
            <Chip tone="on">python</Chip>
            <Chip tone="on">distributed systems</Chip>
            <Chip tone="suggest">+ typescript</Chip>
            <Chip tone="neutral">neutral</Chip>
            <Chip tone="cream">interesting</Chip>
            <Chip tone="amber">follow up</Chip>
            <Chip tone="alert">needs attention</Chip>
            <Chip tone="gradient">NEW</Chip>
            <Chip tone="gradient">Top connector</Chip>
            <Chip tone="selected" leading={<CheckIcon />}>
              Follow up
            </Chip>
          </div>
        </Section>

        <Section title="Avatars">
          <div className="flex items-end gap-3">
            <Avatar name="Alex Morgan" size="sm" />
            <Avatar name="Jordan Lee" size="md" />
            <Avatar name="Taylor Chen" size="lg" />
            <Avatar name="Casey Patel" size="xl" />
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-[16px] bg-subtle p-6">
            <Avatar name="Alex Morgan" size="ring" />
            <Avatar name="Alex Morgan" size="lg" strongFit />
            <Avatar name="Example Build Co" size="company" />
          </div>
          <p className="mt-1 text-xs text-faint">
            Ring (hollow serif initials), strongFit (spectrum ring around any
            size), company (rounded-square cream + ink initials).
          </p>
        </Section>

        <Section title="Cards">
          <Card>
            <p className="text-sm text-muted">
              Plain card — hairline border, default radius md (12px).
            </p>
          </Card>
          <Card radius="lg" tone="plain">
            <div className="flex items-start gap-3">
              <Avatar name="Alex Morgan" size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-serif text-xl text-ink">Alex Morgan</p>
                <p className="truncate text-sm text-muted">
                  radius lg (16px) for people cards.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone="on">python</Chip>
                  <Chip tone="on">distributed systems</Chip>
                </div>
              </div>
            </div>
          </Card>
          <Card tone="attention" radius="lg">
            <p className="text-sm text-ink">
              <span className="font-semibold">Happening now ·</span> Patch the
              Conference · 6 shortlisted
            </p>
            <p className="mt-1 text-xs text-muted">
              Attention tone: cream fill + 2px spectrum-yellow stroke. Reused on
              live card, high-match card, selected scope.
            </p>
          </Card>
          <Card tone="suggest" radius="md">
            <p className="text-sm text-muted">
              Suggest tone: dashed outline for empty / to-be-filled states.
            </p>
          </Card>
          <Card tone="subtle" radius="xl">
            <p className="text-sm text-ink">
              Subtle tone, radius xl (20px) — borderless tonal panel.
            </p>
          </Card>
        </Section>

        <Section title="Toasts">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => showToast("Note saved to Maya's memory")}
            >
              Simple toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                showToast("Note saved to Maya's memory", {
                  action: {
                    label: "Undo",
                    onClick: () =>
                      showToast("Undo clicked (demo only)", {
                        durationMs: 1600,
                      }),
                  },
                })
              }
            >
              With Undo (amber)
            </Button>
          </div>
        </Section>

        <Section title="Brand marks">
          <div className="flex items-center gap-6">
            <Wordmark size="lg" />
            <Logo size={36} />
            <Logo size={28} />
          </div>
        </Section>

        <Section title="Emoji glyphs">
          <div className="flex flex-wrap gap-3">
            {[
              "met",
              "warm",
              "speaker",
              "note",
              "clock",
              "checkc",
              "loader",
              "shortlisted",
              "follow-up",
              "warm-intro",
            ].map((n) => (
              <div
                key={n}
                className="flex flex-col items-center gap-1 rounded-[12px] bg-card border border-line p-2"
              >
                <Image
                  src={`/emoji/${n}.svg`}
                  alt={n}
                  width={28}
                  height={28}
                />
                <span className="text-[10px] text-faint">{n}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-faint">
            Placeholder SVGs; swap for Fluent Emoji Flat (MIT) in a later PR
            without changing filenames.
          </p>
        </Section>

        <Section title="Bottom nav">
          <p className="text-xs text-faint">
            Fixed to the viewport bottom; mic FAB uses the gradient.
          </p>
          <div className="mt-3 rounded-[12px] border border-dashed border-line p-3 text-center text-xs text-faint">
            Current: {nav}
          </div>
        </Section>
      </div>

      <BottomNav active={nav} onSelect={setNav} />
    </PhoneShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}

function Swatch({
  name,
  value,
  className,
}: {
  name: string;
  value: string;
  className: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-14 w-full rounded-[12px] ${className}`} />
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink">{name}</span>
        <span className="text-[10px] text-faint">{value}</span>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3 w-3"
      aria-hidden
    >
      <path
        d="M3 8.5l3 3L13 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
