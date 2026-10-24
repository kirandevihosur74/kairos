import type { DraftRow, PersonCard } from "./api";

export type SheetTab = "to-meet" | "met" | "follow-up";
export function sheetPeople(people: PersonCard[], drafts: DraftRow[], tab: SheetTab): PersonCard[] {
  const approved = new Set(drafts.filter((d) => d.status === "approved").map((d) => d.person_id));
  if (tab === "met") return people.filter((p) => p.met !== null);
  if (tab === "follow-up") return people.filter((p) => p.met !== null && !approved.has(p.id));
  return people.filter((p) => p.triage === "interesting" && p.met === null);
}

export function searchPeople(people: PersonCard[], query: string): PersonCard[] {
  const term = query.trim().toLocaleLowerCase();
  return people.filter((p) => [p.name, p.title, p.company, ...p.topics, p.why.sentence].filter(Boolean).join(" ").toLocaleLowerCase().includes(term));
}

export function peopleCsv(people: PersonCard[]): string {
  // Quoting alone does not stop spreadsheet formula execution.
  const cell = (value: string) => `"${(/^[\s]*[=+@\-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  const rows = people.map((p) => [p.name, p.title ?? "", p.company ?? "", p.topics.join(", "), p.met ? "Met" : "Not met", p.next_step, p.notes.map((n) => n.text).join(" | ")]);
  return "\ufeff" + [["Name", "Title", "Company", "Interests", "Status", "Next step", "Notes"], ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
