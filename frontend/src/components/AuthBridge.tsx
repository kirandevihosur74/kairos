"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LIMIT_EVENT, setTokenGetter } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useToast } from "./Toast";

const LAST_USER_KEY = "kairos.user";
// Per-device state that belongs to whoever was signed in: the onboarding form and the pre-save ranking
// snapshot (the selected event is cleared through the session store).
const SESSION_STORAGE_KEYS = ["kairos.onboarding.draft", "kairos.rank.snapshot"];

/**
 * Connects Clerk to the rest of the app: API calls carry the session token, usage-limit refusals show a
 * toast, signed-out visitors go to sign-in, and a different account on the same device starts clean.
 */
export function AuthBridge() {
  const { getToken } = useAuth();
  const { showToast } = useToast();

  // Set during render, before any page's effects fire their first API request.
  setTokenGetter(() => getToken());

  useEffect(() => {
    // Long enough to read a two-sentence limit message.
    const onLimit = (event: Event) => showToast((event as CustomEvent<string>).detail, 6000);
    window.addEventListener(LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(LIMIT_EVENT, onLimit);
  }, [showToast]);

  // Reading the URL needs a Suspense boundary under cacheComponents; keep it out of the token path.
  return (
    <Suspense fallback={null}>
      <AccountGuard />
    </Suspense>
  );
}

function AccountGuard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { reset } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      if (!pathname.startsWith("/sign-in") && !pathname.startsWith("/sign-up")) router.replace("/sign-in");
      return;
    }
    try {
      if (window.localStorage.getItem(LAST_USER_KEY) !== userId) {
        reset();
        for (const key of SESSION_STORAGE_KEYS) window.sessionStorage.removeItem(key);
        window.localStorage.setItem(LAST_USER_KEY, userId);
      }
    } catch {
      // Storage unavailable: nothing remembered, nothing to clear.
    }
  }, [isLoaded, isSignedIn, userId, pathname, reset, router]);

  return null;
}
