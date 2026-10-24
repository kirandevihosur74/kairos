import type { PersonCard } from "@/lib/api";
import type { CardEnrichment, Reachability } from "./types";

// Per-person enrichment keyed by fixture suffix (e.g. "fixture_p_1").
// Keeps conference_id out of the key so the same mocks apply across conferences.
const BY_FIXTURE: Record<string, CardEnrichment> = {
  fixture_p_1: {
    photo_url: null,
    reachability: "warm",
    verified_match: true,
    three_facts: [
      { text: "Shipped a monorepo caching tool last month.", inCommon: true },
      { text: "Hiring backend engineers in Q1." },
      { text: "Writes about distributed tracing." },
    ],
    openers: [
      "How is your team tackling flaky tests since the monorepo move?",
    ],
    warm_intro: { connector: "Priya Shah", via: "Example Build Co" },
    fun_fact: "Hosts a weekly jam session at a studio in SoMa.",
    session: {
      time: "2:30 PM",
      stage: "Stage B",
      title: "Flaky CI at scale",
    },
  },
  fixture_p_3: {
    photo_url: null,
    reachability: "likely",
    verified_match: false,
    three_facts: [
      { text: "Runs the platform team at Example Data Co." },
      { text: "Interviewed on the Infra Podcast about Postgres sharding." },
      { text: "Open to coffee at the sponsor pavilion.", inCommon: true },
    ],
    openers: ["What's your bar for an on-call rotation these days?"],
    warm_intro: null,
    fun_fact: "Collects vinyl soundtracks.",
    session: null,
  },
  fixture_p_4: {
    photo_url: null,
    reachability: "warm",
    verified_match: false,
    three_facts: [
      { text: "Works on Kubernetes operators at Example Infra Co." },
      { text: "Shared GitHub orgs with you.", inCommon: true },
      { text: "Mentioned hiring for infra IC roles in a recent talk." },
    ],
    openers: ["Have you seen the Argo CD → Flux migrations get easier?"],
    warm_intro: { connector: "Priya Shah" },
    fun_fact: "Finishing a half-marathon series across national parks.",
    session: {
      time: "4:00 PM",
      stage: "Stage A",
      title: "Operators you can live with",
    },
  },
  fixture_p_2: {
    photo_url: null,
    reachability: "maybe",
    verified_match: false,
    three_facts: [
      { text: "DevRel at Example Cloud Co." },
      { text: "Runs the local TypeScript meetup." },
      { text: "Also a backend engineer in a prior life." },
    ],
    openers: [
      "What's one DX improvement you wish every SDK team shipped first?",
    ],
    warm_intro: null,
    fun_fact: "Keeps a plant journal with over 60 entries.",
    session: null,
  },
  fixture_p_5: {
    photo_url: null,
    reachability: "long_shot",
    verified_match: false,
    three_facts: [
      { text: "Community lead for Example Community Co." },
      { text: "Not currently hiring engineers directly." },
      { text: "Great to know for later referrals." },
    ],
    openers: ["How do you keep newcomer energy high at your meetups?"],
    warm_intro: null,
    fun_fact: "Volunteers at a makerspace on weekends.",
    session: null,
  },
};

function fixtureKey(personId: string): string {
  const parts = personId.split(":");
  return parts[parts.length - 1] ?? personId;
}

export function enrichmentFor(personId: string): CardEnrichment {
  return BY_FIXTURE[fixtureKey(personId)] ?? {};
}

export interface EnrichedCard extends PersonCard {
  reachability_tag: Reachability | null;
  verified_match: boolean;
  three_facts: Array<{ text: string; inCommon?: boolean }>;
  openers_mock: string[];
  warm_intro_hint: { connector: string; via?: string } | null;
  fun_fact_mock: string | null;
  session_slot: {
    time: string;
    stage: string;
    title?: string;
  } | null;
}

export function enrich(card: PersonCard): EnrichedCard {
  const ext = enrichmentFor(card.id);
  return {
    ...card,
    photo_url: ext.photo_url ?? card.photo_url,
    reachability_tag: (ext.reachability as Reachability | undefined) ?? null,
    verified_match: ext.verified_match ?? false,
    three_facts: ext.three_facts ?? [],
    openers_mock: ext.openers ?? card.openers ?? [],
    warm_intro_hint: ext.warm_intro ?? null,
    fun_fact_mock: ext.fun_fact ?? card.fun_fact,
    session_slot: ext.session ?? null,
  };
}

export function enrichMany(cards: PersonCard[]): EnrichedCard[] {
  return cards.map(enrich);
}
