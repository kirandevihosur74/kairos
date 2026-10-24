"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip } from "@/components";
import {
  ApiError,
  api,
  type PersonCard,
  type Profile,
  type ProfileInput,
} from "@/lib/api";

interface EditInterestsSheetProps {
  profile: Profile;
  people: PersonCard[];
  onClose: () => void;
  onSaved: (next: Profile) => void;
}

/**
 * 6.2 Edit interests bottom sheet. Rendered as an overlay inside /graph when
 * ?edit=1 is present. Chips:
 *  - SELECTED (profile.interests) → tone="on"
 *  - FROM PEOPLE AT THIS EVENT → tone="suggest"
 *  - newly added by the user in this sheet → tone="gradient" with a NEW tag
 *
 * Saving calls `api.updateProfile(nextProfile)`, snapshots the current /people
 * ordering, closes, and the parent routes to /graph/re-ranked.
 */
export function EditInterestsSheet({
  profile,
  people,
  onClose,
  onSaved,
}: EditInterestsSheetProps) {
  // Working set of selected interests.
  const [selected, setSelected] = useState<string[]>(profile.interests);
  // Interests that didn't exist in profile.interests at mount — these show the NEW tag.
  const [addedThisSession, setAddedThisSession] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discover suggestion topics from the room: union of all person.topics that
  // aren't already selected. Capped to a readable row count.
  const suggestions = useMemo(() => {
    const seen = new Set(selected.map((s) => s.toLowerCase()));
    const bag: string[] = [];
    for (const p of people) {
      for (const topic of p.topics ?? []) {
        const key = topic.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          bag.push(topic);
        }
      }
    }
    return bag.slice(0, 8);
  }, [people, selected]);

  function toggleRemove(topic: string) {
    setSelected((prev) => prev.filter((t) => t !== topic));
    setAddedThisSession((prev) => {
      const next = new Set(prev);
      next.delete(topic);
      return next;
    });
  }

  function addFromSuggestion(topic: string) {
    setSelected((prev) => (prev.includes(topic) ? prev : [...prev, topic]));
    setAddedThisSession((prev) => {
      const next = new Set(prev);
      next.add(topic);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // Snapshot the current /people ordering BEFORE saving. The re-ranked page
      // will compare the new order to this to compute ▲/▼ deltas.
      try {
        if (typeof window !== "undefined") {
          const snapshot = people.map((p) => p.id);
          window.sessionStorage.setItem(
            "kairos.rank.snapshot",
            JSON.stringify(snapshot),
          );
        }
      } catch {
        // sessionStorage may be unavailable; proceed anyway.
      }

      const input: ProfileInput = {
        name: profile.name,
        target_roles: profile.target_roles,
        skills: profile.skills,
        interests: selected,
        background: profile.background,
        location_preferences: profile.location_preferences,
        linkedin_url: profile.linkedin_url,
        import_id: profile.import_id,
      };
      const next = await api.updateProfile(input);
      onSaved(next);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.detail === "string"
          ? err.detail
          : "Could not save your interests.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Dim backdrop (matches Figma rgba(55,53,47,0.35)). */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(55,53,47,0.35)]"
      />
      {/* Sheet */}
      <div className="relative mx-auto flex w-full max-w-[430px] flex-col rounded-t-[20px] border border-line bg-card px-5 pb-6 pt-3 shadow-xl">
        <div
          aria-hidden
          className="mx-auto mb-4 h-[4px] w-10 rounded-full bg-line"
        />
        <h2 className="font-serif text-[28px] leading-[1.1] text-ink">
          Your interests
        </h2>
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">
          These rank everyone at this event. Add one and watch the order change.
        </p>

        {/* SELECTED */}
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
          Selected
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-[13px] text-muted">
              No interests yet — add one below.
            </span>
          ) : null}
          {selected.map((t) => {
            const isNew = addedThisSession.has(t);
            return (
              <Chip
                key={t}
                tone={isNew ? "gradient" : "on"}
                className={
                  isNew
                    ? "cursor-pointer text-white"
                    : "cursor-pointer"
                }
                onClick={() => toggleRemove(t)}
                role="button"
                aria-label={`Remove ${t}`}
              >
                {t}{" "}
                {isNew ? (
                  <span className="ml-1 text-[10px] font-semibold tracking-[0.04em] text-white">
                    NEW
                  </span>
                ) : (
                  <span className="text-muted">×</span>
                )}
              </Chip>
            );
          })}
        </div>

        {/* FROM PEOPLE AT THIS EVENT */}
        {suggestions.length > 0 ? (
          <>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
              From people at this event
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((t) => (
                <Chip
                  key={t}
                  tone="suggest"
                  className="cursor-pointer"
                  onClick={() => addFromSuggestion(t)}
                  role="button"
                  aria-label={`Add ${t}`}
                >
                  + {t}
                </Chip>
              ))}
            </div>
          </>
        ) : null}

        <p className="mt-5 text-[12px] text-muted">
          Saved to your profile. Updates every event, not just this one.
        </p>

        {error ? (
          <p className="mt-2 text-[12px] text-alert">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save and re-rank"}
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
