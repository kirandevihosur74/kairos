import { ApiError, type ImportPreview, type ProfileInput } from "@/lib/api";

export const DRAFT_STORAGE_KEY = "kairos.onboarding.draft";

export interface Draft {
  name: string;
  target_roles: string[];
  interests: string[];
  skills: string[];
  background: string;
  location_preferences: string[];
  linkedin_url: string;
  import_id: string | null;
  resumeFileName?: string | null;
}

export const emptyDraft: Draft = {
  name: "",
  target_roles: [],
  interests: [],
  skills: [],
  background: "",
  location_preferences: [],
  linkedin_url: "",
  import_id: null,
  resumeFileName: null,
};

export function readStoredDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...emptyDraft, ...parsed };
  } catch {
    return emptyDraft;
  }
}

export function writeStoredDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota errors.
  }
}

export function clearStoredDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function applyPreview(
  prev: Draft,
  preview: ImportPreview,
  resumeFileName?: string | null,
): Draft {
  const sp = preview.suggested_profile ?? {};
  return {
    name: sp.name?.trim() || prev.name,
    target_roles: dedupe([...(sp.target_roles ?? []), ...prev.target_roles]),
    interests: dedupe([...(sp.interests ?? []), ...prev.interests]),
    skills: dedupe([...(sp.skills ?? []), ...prev.skills]),
    background: sp.background?.trim() || prev.background,
    location_preferences: dedupe([
      ...(sp.location_preferences ?? []),
      ...prev.location_preferences,
    ]),
    linkedin_url: sp.linkedin_url ?? prev.linkedin_url,
    import_id: preview.import_id,
    resumeFileName: resumeFileName ?? prev.resumeFileName ?? null,
  };
}

export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail) && err.detail.length) return err.detail[0].msg;
    return `Request failed (${err.status})`;
  }
  return fallback;
}

export function toProfileInput(draft: Draft): ProfileInput {
  return {
    name: draft.name.trim(),
    target_roles: dedupe(draft.target_roles),
    interests: dedupe(draft.interests),
    skills: dedupe(draft.skills),
    background: draft.background.trim(),
    location_preferences: dedupe(draft.location_preferences),
    linkedin_url: draft.linkedin_url.trim() || null,
    import_id: draft.import_id,
  };
}
