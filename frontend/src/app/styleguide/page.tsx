"use client";

import { useState } from "react";
import {
  Avatar,
  BottomNav,
  Button,
  Card,
  Chip,
  PhoneShell,
  SectionLabel,
  type NavKey,
} from "@/components";

export default function StyleguidePage() {
  const [nav, setNav] = useState<NavKey>("today");

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-8 px-6 pb-10 pt-4">
        <header className="flex flex-col gap-2">
          <SectionLabel>Styleguide</SectionLabel>
          <h1 className="font-serif text-4xl leading-[1.05] text-ink">
            Kairos foundation
          </h1>
          <p className="text-sm text-muted">
            Instrument Sans for body, Instrument Serif for headlines. Buttons are
            solid ink; gradient is reserved for the mic FAB and progress.
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
            Spectrum: #F7D84A → #F2A14B → #EF8474 → #EE9BB5. Used for the mic FAB
            and progress fills.
          </p>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-2">
            <p className="font-serif text-5xl leading-none text-ink">Serif H1</p>
            <p className="font-serif text-3xl leading-tight text-ink">Serif H2</p>
            <p className="text-base text-ink">Body — Instrument Sans 16.</p>
            <p className="text-sm text-muted">Secondary — muted 14.</p>
            <p className="text-xs text-faint">Caption — faint 12.</p>
            <SectionLabel>Section label</SectionLabel>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" fullWidth>
              Primary ink pill
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="lg">
                Secondary
              </Button>
              <Button variant="ghost" size="lg">
                Ghost
              </Button>
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
            Every primary is solid ink. No gradient on buttons.
          </p>
        </Section>

        <Section title="Progress">
          <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
            <div className="h-full w-2/3 rounded-full bg-spectrum" />
          </div>
          <p className="mt-1 text-xs text-faint">
            Progress fills use the spectrum gradient.
          </p>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2">
            <Chip tone="outline">Sample data</Chip>
            <Chip tone="outline">You</Chip>
            <Chip tone="outline">→ Backend engineer</Chip>
            <Chip tone="on">→ python</Chip>
            <Chip tone="on">distributed systems</Chip>
            <Chip tone="suggest">+ typescript</Chip>
            <Chip tone="neutral">neutral</Chip>
            <Chip tone="cream">interesting</Chip>
            <Chip tone="amber">follow up</Chip>
            <Chip tone="alert">needs attention</Chip>
          </div>
        </Section>

        <Section title="Avatars">
          <div className="flex items-end gap-3">
            <Avatar name="Alex Morgan" size="sm" />
            <Avatar name="Jordan Lee" size="md" />
            <Avatar name="Taylor Chen" size="lg" />
            <Avatar name="Casey Patel" size="xl" />
          </div>
          <div className="mt-3 flex items-center justify-center rounded-[16px] bg-subtle py-6">
            <Avatar name="Alex Morgan" size="ring" />
          </div>
          <p className="mt-1 text-xs text-faint">
            Ring variant for person headers — hollow, serif initials.
          </p>
        </Section>

        <Section title="Card radii">
          <Card>
            <p className="text-sm text-muted">
              Card radius=&ldquo;md&rdquo; (12px) — default.
            </p>
          </Card>
          <Card radius="lg">
            <div className="flex items-start gap-3">
              <Avatar name="Alex Morgan" size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-medium text-ink">Alex Morgan</p>
                <p className="truncate text-sm text-muted">
                  radius=&ldquo;lg&rdquo; (16px) for people cards.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone="on">python</Chip>
                  <Chip tone="on">distributed systems</Chip>
                </div>
              </div>
            </div>
          </Card>
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
