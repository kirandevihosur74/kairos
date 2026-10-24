"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api, type Profile } from "@/lib/api";
import { PhoneShell } from "./PhoneShell";
import { LoadMessage } from "./LoadMessage";

interface RequireProfileProps {
  children: ReactNode | ((profile: Profile) => ReactNode);
}

export function RequireProfile({ children }: RequireProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "redirect" | "error">(
    "loading",
  );

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getProfile().then(
      (p) => {
        if (cancelled) return;
        setProfile(p);
        setStatus("ready");
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 409) {
          setStatus("redirect");
          router.replace("/onboarding");
          return;
        }
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router, retry]);

  if (status !== "ready" || !profile) {
    return <PhoneShell withNavSpacer={false}><LoadMessage loading={status !== "error"} error={status === "error" ? "Could not connect to Kairos. Check the backend and try again." : null} onRetry={() => { setStatus("loading"); setRetry((n) => n + 1); }} /></PhoneShell>;
  }

  return (
    <>{typeof children === "function" ? children(profile) : children}</>
  );
}
