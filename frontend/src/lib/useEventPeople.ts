"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Conference, type PersonCard } from "./api";
import { useSession } from "./session";
import { describeError } from "@/app/onboarding/draft";

export function useEventPeople() {
  const router = useRouter(); const { conferenceId } = useSession();
  const [data, setData] = useState<{ people: PersonCard[]; conference: Conference } | null>(null);
  const [error, setError] = useState<string | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!conferenceId) { router.replace("/events"); return; }
    let cancelled = false;
    Promise.all([api.listPeople(conferenceId, "all"), api.getConferenceStatus(conferenceId)]).then(([people, conference]) => { if (!cancelled) { setData({ people, conference }); setError(null); } }, (err) => { if (!cancelled) setError(describeError(err, "Could not load the event graph.")); });
    return () => { cancelled = true; };
  }, [conferenceId, router, attempt]);
  return { data, error, retry: () => setAttempt((n) => n + 1) };
}
