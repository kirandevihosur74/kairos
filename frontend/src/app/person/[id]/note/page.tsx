"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Avatar, Button, Portrait, RequireProfile, VoiceRecorder, useToast } from "@/components";
import { BottomSheet } from "@/components/BottomSheet";
import { LoadMessage } from "@/components/LoadMessage";
import { api, type PersonCard } from "@/lib/api";
import { routeId } from "@/lib/ranking";
import { useSession } from "@/lib/session";
import { describeError } from "../../../onboarding/draft";

const TAGS = ["Follow up", "Wants a demo", "Intro needed", "Not a fit"];
function NoteCapture() {
  const params = useParams<{ id: string }>(); const id = routeId(params.id);
  const router = useRouter(); const { conferenceId, setCurrentPersonId } = useSession(); const { showToast } = useToast();
  const [person, setPerson] = useState<PersonCard | null>(null); const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]); const [saving, setSaving] = useState(false); const [voiceBusy, setVoiceBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const [loadError, setLoadError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false; setCurrentPersonId(id);
    api.getPerson(id, conferenceId).then((p) => { if (!cancelled) { setPerson(p); setLoadError(null); } }, (err) => { if (!cancelled) setLoadError(describeError(err, "Could not load this person.")); });
    return () => { cancelled = true; };
  }, [conferenceId, id, router, retry, setCurrentPersonId]);
  const body = text.trim() + (tags.length ? `\n\nTags: ${tags.join(", ")}` : "");
  function close() { if (!saving) router.push(`/person/${encodeURIComponent(id)}`); }
  async function save() {
    if (!conferenceId || !person || !text.trim() || body.length > 4000 || saving || voiceBusy) return;
    setSaving(true); setError(null);
    try { await api.saveMetNote(conferenceId, person.id, body); showToast(`Note saved to ${person.name.split(" ")[0]}'s memory`); router.replace("/today"); }
    catch (err) { setError(describeError(err, "Could not save the note. Try again.")); setSaving(false); }
  }
  return <BottomSheet label="Capture meeting note" onClose={close} busy={saving} background={person && <Portrait name={person.name} src={person.photo_url} />}>
    {!person || loadError ? <LoadMessage loading={!loadError} error={loadError} onRetry={() => setRetry((n) => n + 1)} /> : <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header className="flex items-center gap-3"><Avatar name={person.name} src={person.photo_url} size="md" className="shrink-0 rounded-xl" /><div className="flex-1"><h1 className="text-[16px] leading-snug">What did you learn about {person.name.split(" ")[0]}?</h1><p className="mt-1 text-xs text-muted">{[person.title, person.company].filter(Boolean).join(" · ")}</p></div><button type="button" disabled={saving} onClick={close} aria-label="Close note capture" className="flex h-9 w-9 items-center justify-center text-2xl text-muted">×</button></header>
      <VoiceRecorder conferenceId={conferenceId!} personId={person.id} disabled={saving} onBusyChange={setVoiceBusy} onTranscript={(spoken) => setText((current) => current.trim() ? `${current.trim()}\n${spoken}` : spoken)} />
      <label className="flex flex-col gap-2 text-[11px] text-muted">Your note · review before saving<textarea value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} placeholder="Type what you learned, or record and review a transcript." rows={4} className="min-h-24 w-full resize-y bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint" /></label>
      <div className="flex flex-wrap gap-2" aria-label="Note tags">{TAGS.map((tag) => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => setTags((current) => current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag])} className={`rounded-full border px-3 py-2 text-xs ${tags.includes(tag) ? "border-ink text-alert" : "border-transparent text-muted"}`}>{tags.includes(tag) && "✓ "}{tag}</button>)}</div>
      {body.length > 4000 && <p role="alert" className="text-xs text-alert">Shorten the note and tags to 4,000 characters.</p>}{error && <p role="alert" className="text-sm text-alert">{error}</p>}
      <div className="sticky bottom-0 flex gap-2.5 bg-card pt-2"><Button fullWidth disabled={saving} onClick={close}>Discard</Button><Button fullWidth type="submit" variant="primary" disabled={!text.trim() || body.length > 4000 || saving || voiceBusy}>{saving ? "Saving…" : "✓ Save note"}</Button></div>
      <p className="text-xs text-muted">Saved to {person.name.split(" ")[0]}’s memory after you confirm. Notes are append-only.</p>
    </form>}
  </BottomSheet>;
}
export default function NotePage() { return <RequireProfile><Suspense fallback={<LoadMessage loading />}><NoteCapture /></Suspense></RequireProfile>; }
