"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AppNav,
  Avatar,
  Button,
  Card,
  Chip,
  PhoneShell,
  RequireProfile,
  SectionLabel,
} from "@/components";
import { ApiError, api, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { MemorySection } from "./_components/MemorySection";
import { WhyPathDiagram } from "./_components/WhyPath";

type LoadState = "loading" | "ready" | "error";

function PersonPageRoute() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <RequireProfile>
      <PersonPageInner id={id} />
    </RequireProfile>
  );
}

export default function PersonPage() {
  return (
    <Suspense fallback={null}>
      <PersonPageRoute />
    </Suspense>
  );
}

function PersonPageInner({ id }: { id: string }) {
  const router = useRouter();
  const { conferenceId, setCurrentPersonId } = useSession();
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  // Keep the mic nav wired back to this person as long as we're on their page.
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
        setPerson(p);
        setStatus("ready");
      },
      (err) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof ApiError
            ? typeof err.detail === "string"
              ? err.detail
              : "Could not load this person."
            : "Could not load this person.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, conferenceId, router]);

  if (conferenceId === null) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Redirecting…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  if (status === "loading") {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <span className="text-sm text-muted">Loading…</span>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  if (status === "error" || !person) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 px-8 text-center">
          <p className="text-sm text-alert">{error ?? "Could not load this person."}</p>
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
        <AppNav />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-2">
        <TopBar onBack={() => router.back()} />

        <PersonHeader person={person} />

        <section className="flex flex-col gap-2">
          <SectionLabel>Why them</SectionLabel>
          <Card radius="lg" padded className="flex flex-col gap-4">
            <WhyPathDiagram why={person.why} personName={person.name} />
          </Card>
        </section>

        {person.next_step ? (
          <section className="flex flex-col gap-2">
            <SectionLabel>Next step</SectionLabel>
            <Card
              radius="lg"
              padded
              className="bg-cream border-cream text-ink"
            >
              <p className="text-[14px] leading-[1.45]">{person.next_step}</p>
            </Card>
          </section>
        ) : null}

        {person.fun_fact ? (
          <section className="flex flex-col gap-2">
            <SectionLabel>Fun fact</SectionLabel>
            <Card radius="lg" padded>
              <p className="text-[14px] leading-[1.45] text-ink">
                {person.fun_fact}
              </p>
            </Card>
          </section>
        ) : null}

        {person.reachability ? (
          <section className="flex flex-col gap-2">
            <SectionLabel>Reachability</SectionLabel>
            <Card radius="lg" padded>
              <p className="text-[14px] leading-[1.45] text-ink">
                {person.reachability}
              </p>
            </Card>
          </section>
        ) : null}

        {person.warm_intro ? (
          <section className="flex flex-col gap-2">
            <SectionLabel>Warm intro</SectionLabel>
            <Card radius="lg" padded>
              <p className="text-[14px] leading-[1.45] text-ink">
                {person.warm_intro}
              </p>
            </Card>
          </section>
        ) : null}

        {conferenceId ? <MemorySection personId={person.id} conferenceId={conferenceId} /> : null}

        <NotesHistory notes={person.notes} />

        <div className="flex flex-col gap-3 pt-2">
          <Link href={`/person/${encodeURIComponent(person.id)}/note`} className="w-full">
            <Button variant="primary" size="lg" fullWidth>
              Capture a note
            </Button>
          </Link>
          <Link href={`/drafts/new?person=${encodeURIComponent(person.id)}`} className="w-full">
            <Button variant="secondary" size="lg" fullWidth>
              Draft follow-up
            </Button>
          </Link>
        </div>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onBack}
        className="text-[14px] text-alert hover:underline"
      >
        ‹ Shortlist
      </button>
      <span className="font-serif text-[18px] tracking-[-0.01em] text-ink">
        kairos
      </span>
    </div>
  );
}

function PersonHeader({ person }: { person: PersonCard }) {
  const subtitle = [person.title, person.company].filter(Boolean).join(" · ");
  const sampleData = person.data_mode === "fixture";
  const matchLabel =
    person.match_confidence === "high"
      ? "Matches high"
      : person.match_confidence === "medium"
        ? "Matches medium"
        : "Matches low";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <Avatar name={person.name} src={person.photo_url} size="ring" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <h1 className="font-serif text-[28px] leading-[1.05] text-ink">
            {person.name}
          </h1>
          {subtitle ? (
            <p className="text-[13px] text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {person.met ? <Chip tone="on">Met</Chip> : null}
        {sampleData ? <Chip tone="outline">Sample data</Chip> : null}
        <Chip tone="outline">{matchLabel}</Chip>
      </div>
    </div>
  );
}

function NotesHistory({ notes }: { notes: PersonCard["notes"] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        {notes.length > 0 ? `Your notes · ${notes.length}` : "Your notes"}
      </SectionLabel>
      {notes.length === 0 ? (
        <Card radius="lg" padded>
          <p className="text-[13px] leading-[1.5] text-muted">
            No notes yet. Capture one after you meet them — it goes to their
            memory in your graph.
          </p>
        </Card>
      ) : (
        <Card radius="lg" padded className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3">
              <span className="w-14 shrink-0 text-[13px] font-medium text-amber">
                {formatNoteTime(note.created_at)}
              </span>
              <p className="flex-1 text-[14px] leading-[1.4] text-ink">
                {note.text}
              </p>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

function formatNoteTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
