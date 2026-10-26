import { forgetConference } from "./session";

// Same-origin by default: next.config.ts forwards /api/v1 to the backend. Set NEXT_PUBLIC_API_URL
// to an absolute URL only to call a backend directly (that needs KAIROS_FRONTEND_ORIGIN for CORS).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export type DataMode = "fixture" | "live";
/** live: fetched now · cache: fresh snapshot reused · stale: fetch failed, last snapshot shown. */
export type Freshness = "live" | "cache" | "stale";
export type PersonSource = "fixture" | "luma" | "web";
export type ProfileSource = "manual" | "assistant_summary" | "resume_text" | "resume_pdf";
export type TriageDecision = "interesting" | "not_interesting" | null;
export type DraftKind = "introduction" | "follow_up" | "referral";
export type DraftStatus = "draft" | "approved";
export type ConferenceStage = "pending" | "ready" | "failed";
export type MatchConfidence = "low" | "medium" | "high";
export type GroundingType = "profile" | "person" | "note" | "memory" | "user_supplied_job";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  target_roles: string[];
  skills: string[];
  interests: string[];
  background: string;
  location_preferences: string[];
  linkedin_url: string | null;
  import_id: string | null;
  confirmed_at: string;
  source: ProfileSource;
}

export interface ProfileInput {
  name: string;
  target_roles: string[];
  skills?: string[];
  interests: string[];
  background?: string;
  location_preferences?: string[];
  linkedin_url?: string | null;
  import_id?: string | null;
}

export interface ImportPreview {
  import_id: string;
  suggested_profile: Partial<ProfileInput>;
  requires_review: boolean;
}

export interface Conference {
  id: string;
  conference_id: string;
  url: string;
  name: string | null;
  stage: ConferenceStage;
  people_found: number;
  data_mode: DataMode;
  stale: boolean;
  /** Null for fixture events. */
  freshness: Freshness | null;
  source: "luma" | "web" | null;
  created_at: string;
  error: string | null;
  status_url: string;
  /** Live events only. */
  collected_at?: string;
  start_at?: string | null;
  end_at?: string | null;
  city?: string | null;
}

/** One row of GET /conferences ("Your events"). Dates are null for fixture events. */
export interface ConferenceSummary {
  conference_id: string;
  name: string | null;
  url: string;
  stage: ConferenceStage;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  data_mode: DataMode;
  stale: boolean;
  freshness: Freshness | null;
  source: "luma" | "web" | null;
  people_found: number;
  counts: { interesting: number; met: number; drafts_pending: number };
}

export interface SourceRef {
  url: string;
  collected_at: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "User" | "Goal" | "Person" | "Topic";
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface WhyPath {
  sentence: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Note {
  id: string;
  note_id: string;
  person_id: string;
  conference_id: string;
  text: string;
  created_at: string;
}

export interface PersonCard {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  topics: string[];
  photo_url: string | null;
  source: PersonSource;
  data_mode: DataMode;
  /** Live people only: how the event page presents them (speaker, judge, host, ...). */
  event_role?: string;
  /** Web-extracted people only. */
  site?: string;
  extraction?: "ai";
  match_confidence: MatchConfidence;
  stale: boolean;
  sources: SourceRef[];
  conference_id: string;
  score: number;
  why: WhyPath;
  who: string;
  next_step: string;
  notes: Note[];
  /** Set once a meeting note exists; the note text itself is in `notes`. */
  met: { date: string } | null;
  triage: TriageDecision;
  warm_intro: string | null;
  reachability: string | null;
  fun_fact: string | null;
  talks: string[];
  signals: string[];
  openers: string[];
}

export interface Grounding {
  id: string;
  type: GroundingType;
  text: string;
  sources?: SourceRef[];
  /** Memory items only: the graph path that links the fact to this person. */
  path?: string[];
}

/** One fact from the user's graph memory that bears on a person. */
export interface MemoryItem {
  id: string;
  type: "earlier_meeting" | "earlier_message" | "colleague_conversation";
  summary: string;
  text: string;
  created_at: string | null;
  person: { id: string; name: string; title: string | null; company: string | null };
  conference: { id: string | null; name: string | null };
  /** e.g. ["Alex", "WORKS_AT", "Example Co", "WORKS_AT", "Riley"] */
  path: string[];
}

export interface PersonMemory {
  person_id: string;
  sentence: string;
  items: MemoryItem[];
}

export interface Draft {
  id: string;
  draft_id: string;
  person_id: string;
  conference_id: string;
  kind: DraftKind;
  subject: string;
  body: string;
  linkedin_message: string;
  grounded_on: Grounding[];
  status: DraftStatus;
  generation_mode: "template" | "ai";
  model: string | null;
  /** Set when AI drafting failed and a template was shown instead. */
  generation_note: string | null;
  data_mode: DataMode;
  created_at: string;
  approved_at: string | null;
}

export interface DraftRow extends Draft {
  person: {
    id: string;
    name: string | null;
    title: string | null;
    company: string | null;
    photo_url: string | null;
  };
}

export interface VoiceTranscript {
  text: string;
  model: string;
  conference_id: string | null;
  person_id: string | null;
  /** People named in the note; only filled when no person_id was sent. */
  person_candidates: DraftRow["person"][];
  saved: false;
}

export interface HealthStatus {
  status: string;
  storage: string;
  single_user_demo: boolean;
  ingestion: string;
  live_sources: ("luma" | "any_public_page")[];
  draft_generation: string;
  voice_transcription: string | null;
}

export interface TriageResult {
  id: string;
  conference_id: string;
  person_id: string;
  decision: TriageDecision;
  updated_at: string;
}

export interface ApiErrorBody {
  detail: string | { msg: string; type: string }[];
}

export class ApiError extends Error {
  status: number;
  detail: ApiErrorBody["detail"];
  constructor(status: number, detail: ApiErrorBody["detail"]) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(`${API_URL}${path}`, base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// Registered by AuthBridge with Clerk's getToken, so every request carries the signed-in session.
let tokenGetter: (() => Promise<string | null>) | null = null;
export function setTokenGetter(getter: (() => Promise<string | null>) | null) {
  tokenGetter = getter;
}

/** Window event fired when the API refuses a request for a usage limit (429); AuthBridge shows a toast. */
export const LIMIT_EVENT = "kairos:limit";

async function request<T>(
  path: string,
  init: RequestInit & { query?: Query } = {},
): Promise<T> {
  const { query, headers, ...rest } = init;
  const token = tokenGetter ? await tokenGetter() : null;
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // JSON bodies only: FormData uploads need the browser's multipart boundary header.
      ...(typeof rest.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let detail: ApiErrorBody["detail"] = res.statusText;
    try {
      const body = (await res.json()) as ApiErrorBody;
      detail = body.detail ?? detail;
    } catch {
      // Non-JSON body; keep statusText.
    }
    if (res.status === 404 && detail === "Conference not found") forgetConference();
    if (res.status === 429 && typeof window !== "undefined") {
      const message = typeof detail === "string" ? detail : "You've hit a usage limit. Try again later.";
      window.dispatchEvent(new CustomEvent(LIMIT_EVENT, { detail: message }));
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Usage {
  used: number;
  limit: number;
}

/** GET /me: admins have no limits (usage null); everyone else sees today's usage per costly action. */
export interface Me {
  user_id: string;
  admin: boolean;
  usage: { event_fetch: Usage; draft: Usage; voice: Usage } | null;
}

export const api = {
  health: () => request<HealthStatus>("/health"),

  me: () => request<Me>("/me"),

  saveOnboarding: (profile: ProfileInput) =>
    request<Profile>("/onboarding", {
      method: "POST",
      body: JSON.stringify(profile),
    }),

  getProfile: () => request<Profile>("/profile"),

  updateProfile: (profile: ProfileInput) =>
    request<Profile>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),

  importText: (source: "manual" | "assistant_summary" | "resume_text", text: string) =>
    request<ImportPreview>("/onboarding/import-text", {
      method: "POST",
      body: JSON.stringify({ source, text }),
    }),

  importResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportPreview>("/onboarding/resume", {
      method: "POST",
      body: form,
      // Let the browser set the multipart Content-Type.
      headers: { Accept: "application/json" },
    });
  },

  // The first load of a large event page can take about a minute (fetch + AI extraction).
  createConference: (url: string, name?: string, dataMode: DataMode = "live") =>
    request<Conference>("/conference", {
      method: "POST",
      body: JSON.stringify({ url, name, data_mode: dataMode }),
      signal: AbortSignal.timeout(150_000),
    }),

  listConferences: () => request<ConferenceSummary[]>("/conferences"),

  getConferenceStatus: (conferenceId: string) =>
    request<Conference>(`/conference/${conferenceId}/status`),

  listPeople: (conferenceId: string, triage?: "interesting" | "not_interesting" | "all") =>
    request<PersonCard[]>("/people", {
      query: { conference_id: conferenceId, triage },
    }),

  getPerson: (personId: string, conferenceId: string) =>
    request<PersonCard>(`/people/${personId}`, {
      query: { conference_id: conferenceId },
    }),

  getMemory: (personId: string, conferenceId: string) =>
    request<PersonMemory>(`/people/${personId}/memory`, {
      query: { conference_id: conferenceId },
    }),

  getPersonGraph: (personId: string, conferenceId: string) =>
    request<WhyPath>(`/people/${personId}/graph`, {
      query: { conference_id: conferenceId },
    }),

  triage: (conferenceId: string, personId: string, decision: TriageDecision) =>
    request<TriageResult>("/triage", {
      method: "POST",
      body: JSON.stringify({
        conference_id: conferenceId,
        person_id: personId,
        decision,
      }),
    }),

  saveMetNote: (conferenceId: string, personId: string, note: string) =>
    request<Note>("/met", {
      method: "POST",
      body: JSON.stringify({
        conference_id: conferenceId,
        person_id: personId,
        note,
      }),
    }),

  priorities: (conferenceId: string) =>
    request<PersonCard[]>("/priorities", {
      query: { conference_id: conferenceId },
    }),

  draftFollowup: (
    personId: string,
    conferenceId: string,
    kind: DraftKind,
    jobUrl?: string,
    jobDescription?: string,
  ) =>
    request<Draft>(`/followups/${personId}/draft`, {
      method: "POST",
      body: JSON.stringify({
        conference_id: conferenceId,
        kind,
        job_url: jobUrl,
        job_description: jobDescription,
      }),
    }),

  listDrafts: (conferenceId?: string, status?: DraftStatus) =>
    request<DraftRow[]>("/drafts", {
      query: { conference_id: conferenceId, status },
    }),

  getDraft: (draftId: string) => request<Draft>(`/drafts/${draftId}`),

  /** Speech-to-text only; nothing is saved. Submit the reviewed text with saveMetNote. */
  transcribeVoice: (audio: Blob, conferenceId?: string, personId?: string) => {
    const form = new FormData();
    const ext = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
    form.append("file", audio, `note.${ext}`);
    if (conferenceId) form.append("conference_id", conferenceId);
    if (personId) form.append("person_id", personId);
    return request<VoiceTranscript>("/voice/transcribe", {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
    });
  },

  updateDraft: (
    draftId: string,
    patch: { subject: string; body: string; linkedin_message: string },
  ) =>
    request<Draft>(`/drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  approveDraft: (
    draftId: string,
    content: { subject: string; body: string; linkedin_message: string },
  ) =>
    request<Draft>(`/followups/${draftId}/approve`, {
      method: "POST",
      body: JSON.stringify(content),
    }),
};
