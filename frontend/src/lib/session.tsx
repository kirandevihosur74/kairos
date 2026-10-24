"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

interface SessionState {
  conferenceId: string | null;
  currentPersonId: string | null;
}

interface SessionContextValue extends SessionState {
  setConferenceId: (id: string | null) => void;
  setCurrentPersonId: (id: string | null) => void;
  reset: () => void;
}

const STORAGE_KEY = "kairos.session";
const EMPTY: SessionState = { conferenceId: null, currentPersonId: null };

let hydrated = false;
let current: SessionState = EMPTY;
const subscribers = new Set<() => void>();

function readStorage(): SessionState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      conferenceId: parsed.conferenceId ?? null,
      currentPersonId: parsed.currentPersonId ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  current = readStorage();
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore quota errors.
  }
}

function notify() {
  for (const cb of subscribers) cb();
}

function subscribe(cb: () => void): () => void {
  hydrate();
  subscribers.add(cb);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      current = readStorage();
      notify();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      subscribers.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): SessionState {
  hydrate();
  return current;
}

function getServerSnapshot(): SessionState {
  return EMPTY;
}

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // The store is module-level; this provider only exists to make dependency
  // ordering explicit in the tree.
  return <>{children}</>;
}

export function useSession(): SessionContextValue {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setConferenceId = useCallback((id: string | null) => {
    current = { ...current, conferenceId: id, currentPersonId: null };
    persist();
    notify();
  }, []);

  const setCurrentPersonId = useCallback((id: string | null) => {
    current = { ...current, currentPersonId: id };
    persist();
    notify();
  }, []);

  const reset = useCallback(() => {
    current = { ...EMPTY };
    persist();
    notify();
  }, []);

  return useMemo<SessionContextValue>(
    () => ({
      conferenceId: state.conferenceId,
      currentPersonId: state.currentPersonId,
      setConferenceId,
      setCurrentPersonId,
      reset,
    }),
    [state, setConferenceId, setCurrentPersonId, reset],
  );
}
