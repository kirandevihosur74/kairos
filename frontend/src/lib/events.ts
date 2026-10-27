import type { Conference, ConferenceSummary } from "./api";

export function eventDate(event: Pick<Conference | ConferenceSummary, "start_at" | "end_at">): string {
  if (!event.start_at) return "";
  const start = new Date(event.start_at);
  if (Number.isNaN(start.getTime())) return "";
  return start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function eventPhase(event: Pick<Conference | ConferenceSummary, "start_at" | "end_at">, now: number): "now" | "upcoming" | "past" | "undated" {
  const start = Date.parse(event.start_at ?? "");
  const end = Date.parse(event.end_at ?? "");
  if (Number.isFinite(end) && end < now) return "past";
  if (Number.isFinite(start) && start > now) return "upcoming";
  if (Number.isFinite(start) && Number.isFinite(end)) return "now";
  return "undated";
}
