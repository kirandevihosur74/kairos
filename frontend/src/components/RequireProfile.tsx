"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api, type Profile } from "@/lib/api";

interface RequireProfileProps {
  children: ReactNode | ((profile: Profile) => ReactNode);
}

export function RequireProfile({ children }: RequireProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "redirect">(
    "loading",
  );

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
        // Other errors — leave the loading state visible; the user can retry.
        console.error("Failed to load profile", err);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status !== "ready" || !profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <>{typeof children === "function" ? children(profile) : children}</>
  );
}
