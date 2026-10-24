"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PhoneShell } from "@/components";
import { ApiError, api } from "@/lib/api";
import { useSession } from "@/lib/session";

// Entry point: send people to onboarding, event setup, or their day, depending on what exists.
export default function Home() {
  const router = useRouter();
  const { conferenceId } = useSession();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getProfile().then(
      () => {
        if (!cancelled) router.replace(conferenceId ? "/today" : "/events");
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 409) router.replace("/onboarding");
        else setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conferenceId, router, retry]);

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col justify-center gap-3 px-6 pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Kairos</p>
        <h1 className="font-serif text-5xl leading-[1.05] text-ink">Make the room worth it.</h1>
        <p role={error ? "alert" : "status"} className="text-sm text-muted">{error ? "Could not connect to Kairos." : "Loading…"}</p>
        {error && <button onClick={() => { setError(false); setRetry((n) => n + 1); }} className="self-start rounded-full bg-ink px-5 py-3 text-sm text-white">Try again</button>}
      </div>
    </PhoneShell>
  );
}
