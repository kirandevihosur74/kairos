import type { Fact } from "@/lib/data/types";
import { Chip } from "./Chip";

export interface FactListProps {
  facts: Fact[];
  limit?: number;
}

export function FactList({ facts, limit = 3 }: FactListProps) {
  const items = facts.slice(0, limit);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f, i) => (
        <li
          key={i}
          className="flex items-start justify-between gap-3 text-[15px] text-ink leading-snug"
        >
          <span className="flex-1">{f.text}</span>
          {f.inCommon ? (
            <Chip tone="selected" className="shrink-0">
              In common
            </Chip>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
