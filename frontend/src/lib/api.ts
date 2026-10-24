export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type DataMode = "fixture";
export type ProfileSource = "manual" | "assistant_summary" | "resume_text" | "resume_pdf";
export type TriageDecision = "interesting" | "not_interesting" | null;
export type DraftKind = "introduction" | "follow_up" | "referral";
export type DraftStatus = "draft" | "approved";
export type ConferenceStage = "pending" | "ready" | "failed";
export type MatchConfidence = "low" | "medium" | "high";
export type GroundingType = "profile" | "person" | "note";

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
  created_at: string;
  error: string | null;
  status_url: string;
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
  source: "fixture";
  data_mode: DataMode;
  match_confidence: MatchConfidence;
  stale: boolean;
  sources: SourceRef[];
  conference_id: string;
  score: number;
  why: WhyPath;
  who: string;
  next_step: string;
  notes: Note[];
  met: Note | null;
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
  generation_mode: "template";
  data_mode: DataMode;
  created_at: string;
  approved_at: string | null;
}

export interface HealthStatus {
  status: string;
  storage: string;
  single_user_demo: boolean;
  ingestion: string;
  draft_generation: string;
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
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  init: RequestInit & { query?: Query } = {},
): Promise<T> {
  const { query, headers, ...rest } = init;
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
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
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthStatus>("/health"),

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

  createConference: (url: string, name?: string) =>
    request<Conference>("/conference", {
      method: "POST",
      body: JSON.stringify({ url, name, data_mode: "fixture" as DataMode }),
    }),

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

  getDraft: (draftId: string) => request<Draft>(`/drafts/${draftId}`),

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
