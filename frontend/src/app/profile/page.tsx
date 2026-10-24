"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, RequireProfile, SectionLabel, useToast } from "@/components";
import { BottomSheet } from "@/components/BottomSheet";
import { api, type PersonCard, type Profile, type ProfileInput } from "@/lib/api";
import { rememberRanking } from "@/lib/ranking";
import { useSession } from "@/lib/session";
import { ChipField } from "../onboarding/ChipField";
import { describeError } from "../onboarding/draft";

function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter(); const { conferenceId } = useSession(); const { showToast } = useToast();
  const [input, setInput] = useState<ProfileInput>({ name: profile.name, target_roles: profile.target_roles, interests: profile.interests, skills: profile.skills, background: profile.background, location_preferences: profile.location_preferences, linkedin_url: profile.linkedin_url, import_id: profile.import_id });
  const [people, setPeople] = useState<PersonCard[]>([]); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.listPeople(conferenceId, "all").then((list) => { if (!cancelled) setPeople(list); }, () => {});
    return () => { cancelled = true; };
  }, [conferenceId]);
  const suggestions = [...new Set(people.flatMap((p) => p.topics))].filter((topic) => !input.interests.some((i) => i.toLowerCase() === topic.toLowerCase()));
  const added = input.interests.filter((i) => !profile.interests.includes(i));
  function close() { if (!saving) router.push(conferenceId ? "/graph" : "/events"); }
  async function save() {
    if (saving || !input.name.trim() || !input.interests.length || !input.target_roles.length) return;
    setSaving(true); setError(null);
    try {
      if (conferenceId) {
        const before = await api.listPeople(conferenceId, "all").catch(() => people);
        rememberRanking(conferenceId, before, profile.interests);
      }
      await api.updateProfile({ ...input, name: input.name.trim(), linkedin_url: input.linkedin_url?.trim() ? (/^https?:\/\//i.test(input.linkedin_url.trim()) ? input.linkedin_url.trim() : `https://${input.linkedin_url.trim()}`) : null });
      showToast("Profile saved. Your matches have been updated."); router.push(conferenceId ? "/graph/re-ranked" : "/events");
    } catch (err) { setError(describeError(err, "Could not save your profile.")); setSaving(false); }
  }
  return <BottomSheet label="Edit your interests" onClose={close} busy={saving} background={<div className="px-5 pt-20 text-white"><h1 className="font-serif text-[32px]">How you’re connected</h1></div>}>
    <div className="flex flex-col gap-5"><header className="flex items-center justify-between"><h1 className="font-serif text-[30px]">Your interests</h1><button type="button" onClick={close} disabled={saving} aria-label="Close interest editor" className="flex h-9 w-9 items-center justify-center text-2xl text-muted">×</button></header>
      <p className="text-sm leading-relaxed text-muted">These rank everyone at your events. Add one and see how the order changes.</p>
      <ChipField label="Selected" values={input.interests} onChange={(interests) => setInput({ ...input, interests })} placeholder="Add an interest" />
      {added.length > 0 && <p className="text-xs text-muted"><span className="mr-2 rounded-full bg-spectrum px-2 py-1 text-[10px] text-ink">NEW</span>{added.join(", ")}</p>}
      {suggestions.length > 0 && <section><SectionLabel>From people at this event</SectionLabel><div className="mt-3 flex flex-wrap gap-2">{suggestions.slice(0, 12).map((topic) => <button key={topic} type="button" disabled={input.interests.length >= 20} onClick={() => setInput({ ...input, interests: [...input.interests, topic] })} className="rounded-full bg-subtle px-3 py-2 text-[13px] text-muted disabled:opacity-40">+ {topic}</button>)}</div></section>}
      <details className="rounded-xl border border-line p-3"><summary className="text-sm">Edit roles and profile details</summary><div className="mt-4 flex flex-col gap-4"><ChipField label="Target roles" values={input.target_roles} onChange={(target_roles) => setInput({ ...input, target_roles })} placeholder="Add a role" /><label className="text-sm">Name<input maxLength={200} value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label><ChipField label="Skills" values={input.skills ?? []} onChange={(skills) => setInput({ ...input, skills })} placeholder="Add a skill" /><ChipField label="Location" values={input.location_preferences ?? []} onChange={(location_preferences) => setInput({ ...input, location_preferences })} placeholder="Add a location" /><label className="text-sm">About you<textarea rows={3} maxLength={5000} value={input.background ?? ""} onChange={(e) => setInput({ ...input, background: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label><label className="text-sm">LinkedIn · optional<input value={input.linkedin_url ?? ""} onChange={(e) => setInput({ ...input, linkedin_url: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label></div></details>
      <p className="text-xs text-muted">Saved to your profile. Updates every event, not just this one.</p>
      {error && <p role="alert" className="text-sm text-alert">{error}</p>}
      <div className="sticky bottom-0 bg-card pt-2"><Button fullWidth variant="primary" disabled={saving || !input.name.trim() || !input.interests.length || !input.target_roles.length} onClick={() => void save()}>{saving ? "Saving…" : "Save and re-rank"}</Button></div>
    </div>
  </BottomSheet>;
}
export default function ProfilePage() { return <RequireProfile>{(profile) => <ProfileEditor profile={profile} />}</RequireProfile>; }
