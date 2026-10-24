"use client";

import { useEffect, useState } from "react";
import { Card, SectionLabel } from "@/components";
import { api, type MemoryItem } from "@/lib/api";

// Facts the user's FalkorDB graph links to this person: earlier meetings with them at other
// events, and conversations with colleagues at the same company. Hidden when there are none.
export function MemorySection({ personId, conferenceId }: { personId: string; conferenceId: string }) {
  const [items, setItems] = useState<MemoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.getMemory(personId, conferenceId).then(
      (memory) => {
        if (!cancelled) setItems(memory.items);
      },
      () => {
        // Memory is additive; the rest of the page works without it.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [personId, conferenceId]);

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>From your memory · {items.length}</SectionLabel>
      {items.map((item) => (
        <Card key={item.id} radius="lg" padded>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium text-ink">{item.summary}</p>
            <p className="text-[14px] leading-[1.45] text-ink">&ldquo;{item.text}&rdquo;</p>
            <p className="text-[11px] tracking-[0.02em] text-faint">{item.path.join(" → ")}</p>
          </div>
        </Card>
      ))}
    </section>
  );
}
