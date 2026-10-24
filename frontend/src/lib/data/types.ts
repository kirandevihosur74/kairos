export type Reachability = "warm" | "likely" | "maybe" | "long_shot";

export interface Fact {
  text: string;
  inCommon?: boolean;
}

export interface WarmIntroHint {
  connector: string;
  via?: string;
}

export interface SessionSlot {
  time: string;
  stage: string;
  title?: string;
}

export interface CardEnrichment {
  photo_url?: string | null;
  reachability?: Reachability | null;
  three_facts?: Fact[];
  openers?: string[];
  warm_intro?: WarmIntroHint | null;
  fun_fact?: string | null;
  session?: SessionSlot | null;
  verified_match?: boolean;
}

export const REACHABILITY_META: Record<
  Reachability,
  { label: string; emoji: string }
> = {
  warm: { label: "Warm", emoji: "warm" },
  likely: { label: "Likely", emoji: "met" },
  maybe: { label: "Maybe", emoji: "clock" },
  long_shot: { label: "Long shot", emoji: "loader" },
};
