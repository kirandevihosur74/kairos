"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AppNav, PhoneShell, RequireProfile } from "@/components";

function Redirector() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const person = search.get("person");
    const kind = search.get("kind");
    if (person) params.set("person", person);
    if (kind) params.set("kind", kind);
    const qs = params.toString();
    router.replace(qs ? `/drafts/new/type?${qs}` : "/drafts/new/type");
  }, [router, search]);

  return (
    <PhoneShell>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted">Loading…</span>
      </div>
      <AppNav />
    </PhoneShell>
  );
}

export default function NewDraftPage() {
  return (
    <RequireProfile>
      <Suspense
        fallback={
          <PhoneShell>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-muted">Loading…</span>
            </div>
            <AppNav />
          </PhoneShell>
        }
      >
        <Redirector />
      </Suspense>
    </RequireProfile>
  );
}
