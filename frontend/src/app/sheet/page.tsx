"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppNav, Avatar, Button, DesignIcon, PhoneShell, RequireProfile, useToast } from "@/components";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type DraftRow, type PersonCard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { peopleCsv, searchPeople, sheetPeople, type SheetTab } from "@/lib/people";
import { describeError } from "../onboarding/draft";

function LeadSheet() {
  const router = useRouter();
  const params = useSearchParams();
  const skipped = params.get("view") === "skipped";
  const { conferenceId, setCurrentPersonId } = useSession();
  const { showToast } = useToast();
  const [data, setData] = useState<{ people: PersonCard[]; drafts: DraftRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<SheetTab>("to-meet");
  const [query, setQuery] = useState("");
  const [table, setTable] = useState(false);
  const [sort, setSort] = useState("fit");
  const [filters, setFilters] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.listPeople(conferenceId, "all"), api.listDrafts(conferenceId)]).then(
      ([people, drafts]) => { if (!cancelled) { setData({ people, drafts }); setError(null); } },
      (err) => { if (!cancelled) setError(describeError(err, "Could not load your lead sheet.")); },
    );
    return () => { cancelled = true; };
  }, [conferenceId, router, retry]);

  const visible = useMemo(() => {
    if (!data) return [];
    const group = skipped ? data.people.filter((p) => p.triage === "not_interesting") : sheetPeople(data.people, data.drafts, tab);
    return searchPeople(group, query).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? (b.notes.at(-1)?.created_at ?? "").localeCompare(a.notes.at(-1)?.created_at ?? "") : b.score - a.score || a.name.localeCompare(b.name));
  }, [data, skipped, tab, query, sort]);

  function open(person: PersonCard) {
    setCurrentPersonId(person.id);
    router.push(`/person/${encodeURIComponent(person.id)}`);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([peopleCsv(visible)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = "kairos-lead-sheet.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Lead sheet exported");
  }
  async function restore(person: PersonCard) {
    if (!conferenceId || pending) return;
    setPending(person.id);
    try {
      await api.triage(conferenceId, person.id, "interesting");
      setData((prev) => prev && ({ ...prev, people: prev.people.map((p) => p.id === person.id ? { ...p, triage: "interesting" } : p) }));
      showToast("Added to your shortlist");
    } catch (err) { showToast(describeError(err, "Could not save that choice.")); }
    finally { setPending(null); }
  }

  return <PhoneShell>
    <div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-[34px] tracking-[-0.02em]">{skipped ? "Skipped people" : "Lead sheet"}</h1>
        <div className="flex gap-2">
          <button type="button" aria-label={table ? "Show cards" : "Show table"} aria-pressed={table} onClick={() => setTable(!table)} className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle"><DesignIcon name="sheet" /></button>
          <button type="button" aria-label="Export lead sheet" disabled={!visible.length} onClick={download} className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle disabled:opacity-40"><DesignIcon name="download" /></button>
        </div>
      </header>
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-subtle px-3"><DesignIcon name="search" /><input aria-label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, companies, interests" className="h-10 w-full min-w-0 bg-transparent text-[14px] outline-none" /></label>
        <button type="button" aria-label="Sort people" aria-expanded={filters} onClick={() => setFilters(!filters)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-subtle"><DesignIcon name="filter" /></button>
      </div>
      {filters && <label className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-sm">Sort by<select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} className="bg-card p-2"><option value="fit">Best fit</option><option value="name">Name</option><option value="recent">Latest note</option></select></label>}
      {!skipped && <div className="flex rounded-full bg-subtle p-[3px]" role="tablist" aria-label="Lead status">
        {([['to-meet', 'To meet'], ['met', 'Met'], ['follow-up', 'Follow up']] as const).map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={tab === key} aria-controls="lead-results" onClick={() => setTab(key)} className={`flex-1 rounded-full py-2 text-[13px] ${tab === key ? "bg-card font-semibold" : "text-muted"}`}>{label} <span className="ml-1 text-xs text-muted">{data ? sheetPeople(data.people, data.drafts, key).length : "—"}</span></button>)}
      </div>}
      <div className="flex items-center justify-between text-xs text-muted"><span>{sort === "fit" ? "Best fit first" : sort === "name" ? "Alphabetical order" : "Latest conversation first"}</span><Link href={skipped ? "/sheet" : "/sheet?view=skipped"} className="py-1 text-alert">{skipped ? "Back to sheet" : "Review skipped"}</Link></div>
      {error ? <LoadMessage error={error} onRetry={() => setRetry((n) => n + 1)} /> : !data ? <LoadMessage loading /> : visible.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-5 py-12 text-center"><h2 className="font-serif text-2xl">{query ? "No matches." : "Room for a conversation."}</h2><p className="text-sm text-muted">{query ? "Try another name, company or interest." : skipped ? "You haven't skipped anyone." : tab === "to-meet" ? "Mark someone interesting in Discover to add them here." : tab === "met" ? "Save a meeting note to keep track of who you've met." : "Your follow-ups are up to date."}</p><Link href="/discover" className="text-sm text-alert">Discover people →</Link></div> : table ? <div id="lead-results" role="tabpanel" className="overflow-x-auto rounded-xl border border-line bg-card"><table className="w-full text-left text-sm"><thead className="bg-subtle text-xs text-muted"><tr><th className="p-3">Person</th><th className="p-3">Company</th><th className="p-3">Status</th></tr></thead><tbody>{visible.map((p) => <tr key={p.id} className="border-t border-line"><td className="p-3"><button onClick={() => open(p)} className="text-left text-alert">{p.name}</button></td><td className="p-3">{p.company ?? "—"}</td><td className="p-3">{p.met ? "Met" : "To meet"}</td></tr>)}</tbody></table></div> : <div id="lead-results" role="tabpanel" className="flex flex-col gap-3">
        {visible.map((p) => <article key={p.id} className="rounded-2xl bg-card p-4 shadow-[0_3px_12px_rgba(55,53,47,0.035)]">
          <button onClick={() => open(p)} className="flex w-full items-center gap-3 text-left"><Avatar name={p.name} src={p.photo_url} size="lg" className="shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate font-serif text-[25px] leading-tight">{p.name}</span><span className="block text-xs text-muted">{[p.title, p.company].filter(Boolean).join(" · ")}</span></span>{p.reachability && <span className="max-w-24 rounded-full bg-subtle px-2 py-1 text-[11px] text-muted">{p.reachability}</span>}</button>
          <ul className="mt-3 space-y-1.5 text-sm">{[p.signals[0] ?? p.why.sentence, p.fun_fact, p.notes.at(-1)?.text].filter(Boolean).map((line, i) => <li key={i} className="flex gap-2"><span aria-hidden className={i === 2 ? "text-amber" : "text-faint"}>•</span><span>{line}</span></li>)}</ul>
          <div className="mt-3 flex justify-end border-t border-line pt-3">{skipped ? <Button size="sm" disabled={pending !== null} onClick={() => void restore(p)}>Add to shortlist</Button> : <Link className="text-right text-[13px] text-alert" href={tab === "follow-up" ? `/drafts/new/type?person=${encodeURIComponent(p.id)}` : `/person/${encodeURIComponent(p.id)}`}>{tab === "follow-up" ? "Draft follow-up" : p.next_step || "View person"} ›</Link>}</div>
        </article>)}
      </div>}
    </div><AppNav />
  </PhoneShell>;
}

export default function SheetPage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><LeadSheet /></Suspense></RequireProfile>; }
