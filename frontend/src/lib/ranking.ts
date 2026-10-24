import type { PersonCard } from "./api";

export interface RankSnapshot { conferenceId: string; order: string[]; interests: string[] }
const KEY = "kairos.rank.snapshot";
export function rememberRanking(conferenceId: string, people: PersonCard[], interests: string[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ conferenceId, order: people.map((p) => p.id), interests } satisfies RankSnapshot)); } catch { /* Ranking still saves when browser storage is unavailable. */ }
}
export function previousRanking(conferenceId: string): RankSnapshot | null {
  try {
    const item = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as RankSnapshot | null;
    return item?.conferenceId === conferenceId && Array.isArray(item.order) && item.order.every((id) => typeof id === "string") && Array.isArray(item.interests) ? item : null;
  } catch { return null; }
}
export function routeId(value: string): string { try { return decodeURIComponent(value); } catch { return value; } }
