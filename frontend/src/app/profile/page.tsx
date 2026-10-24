"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, PhoneShell, RequireProfile, SectionLabel, useToast } from "@/components";
import { api, type Profile, type ProfileInput } from "@/lib/api";
import { useSession } from "@/lib/session";
import { ChipField } from "../onboarding/ChipField";
import { describeError } from "../onboarding/draft";

function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { conferenceId } = useSession();
  const { showToast } = useToast();
  const [input, setInput] = useState<ProfileInput>({ name: profile.name, target_roles: profile.target_roles, interests: profile.interests, skills: profile.skills, background: profile.background, location_preferences: profile.location_preferences, linkedin_url: profile.linkedin_url, import_id: profile.import_id });
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!conferenceId) return;
    let cancelled = false;
    api.listPeople(conferenceId, "all").then((people) => { if (!cancelled) setTopics([...new Set(people.flatMap((p) => p.topics))]); }, () => {});
    return () => { cancelled = true; };
  }, [conferenceId]);

  async function save() {
    if (saving) return;
    setSaving(true); setError(null);
    try { await api.updateProfile({ ...input, name: input.name.trim(), linkedin_url: input.linkedin_url?.trim() ? (/^https?:\/\//i.test(input.linkedin_url.trim()) ? input.linkedin_url.trim() : `https://${input.linkedin_url.trim()}`) : null }); showToast("Profile saved. Your matches have been updated."); router.push(conferenceId ? "/sheet" : "/events"); }
    catch (err) { setError(describeError(err, "Could not save your profile.")); setSaving(false); }
  }

  return <PhoneShell withNavSpacer={false}><div className="flex flex-1 flex-col px-5 pt-2 pb-7">
    <button className="self-start py-2 text-sm text-alert" onClick={() => router.push(conferenceId ? "/sheet" : "/events")}>‹ Back</button>
    <h1 className="mt-3 font-serif text-[34px]">Your interests</h1><p className="mt-2 text-sm leading-relaxed text-muted">These rank who you meet. Changes apply to every event.</p>
    <div className="mt-7 flex flex-col gap-6"><ChipField label="Selected interests" values={input.interests} onChange={(interests) => setInput({ ...input, interests })} placeholder="Add an interest" />
      {topics.some((topic) => !input.interests.some((i) => i.toLowerCase() === topic.toLowerCase())) && <section><SectionLabel>From people at this event</SectionLabel><div className="mt-3 flex flex-wrap gap-2">{topics.filter((topic) => !input.interests.some((i) => i.toLowerCase() === topic.toLowerCase())).slice(0, 12).map((topic) => <button key={topic} onClick={() => setInput({ ...input, interests: [...input.interests, topic] })} className="rounded-full bg-subtle px-3 py-2 text-[13px] text-muted">+ {topic}</button>)}</div></section>}
      <ChipField label="Target roles" values={input.target_roles} onChange={(target_roles) => setInput({ ...input, target_roles })} placeholder="Add a role" />
      <details className="rounded-xl border border-line bg-card p-4"><summary className="text-sm">Edit profile details</summary><div className="mt-4 flex flex-col gap-4"><label className="text-sm">Name<input maxLength={200} value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label><ChipField label="Skills" values={input.skills ?? []} onChange={(skills) => setInput({ ...input, skills })} placeholder="Add a skill" /><ChipField label="Location" values={input.location_preferences ?? []} onChange={(location_preferences) => setInput({ ...input, location_preferences })} placeholder="Add a location" /><label className="text-sm">About you<textarea rows={4} maxLength={5000} value={input.background ?? ""} onChange={(e) => setInput({ ...input, background: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label><label className="text-sm">LinkedIn · optional<input value={input.linkedin_url ?? ""} onChange={(e) => setInput({ ...input, linkedin_url: e.target.value })} className="mt-2 w-full rounded-lg border border-line p-3" /></label></div></details>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-alert">{error}</p>}
    <Button className="mt-8 min-h-[52px] shrink-0" fullWidth variant="primary" disabled={saving || !input.name.trim() || !input.interests.length || !input.target_roles.length} onClick={() => void save()}>{saving ? "Saving…" : "Save and re-rank"}</Button>
  </div></PhoneShell>;
}

export default function ProfilePage() { return <RequireProfile>{(profile) => <ProfileEditor profile={profile} />}</RequireProfile>; }
