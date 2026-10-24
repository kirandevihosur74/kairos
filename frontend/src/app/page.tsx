"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PhoneShell } from "@/components";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

// Entry point: send people to onboarding, event setup, or their day, depending on what exists.
export default function Home() {
  const router = useRouter();
  const { conferenceId } = useSession();

  useEffect(() => {
    let cancelled = false;
    api.getProfile().then(
      () => {
        if (!cancelled) router.replace(conferenceId ? "/today" : "/event");
      },
      () => {
        // 409 means no profile yet; any other failure also starts at onboarding.
        if (!cancelled) router.replace("/onboarding");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, router]);

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col justify-center gap-3 px-6 pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Kairos</p>
        <h1 className="font-serif text-5xl leading-[1.05] text-ink">Make the room worth it.</h1>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </PhoneShell>
  );
}
