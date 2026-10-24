"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BottomNav, type NavKey } from "./BottomNav";
import { useSession } from "@/lib/session";

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { currentPersonId } = useSession();

  const active: NavKey = resolveActive(pathname, params.get("view"));

  function handleSelect(key: NavKey) {
    switch (key) {
      case "today":
        router.push("/today");
        return;
      case "discover":
        router.push("/discover");
        return;
      case "mic":
        if (currentPersonId) {
          router.push(`/person/${encodeURIComponent(currentPersonId)}/note`);
        } else {
          router.push("/discover?capture=1");
        }
        return;
      case "sheet":
        router.push("/sheet");
        return;
      case "drafts":
        router.push("/drafts");
        return;
    }
  }

  return <BottomNav active={active} onSelect={handleSelect} />;
}

function resolveActive(pathname: string, view: string | null): NavKey {
  if (pathname.startsWith("/sheet")) return "sheet";
  if (pathname.startsWith("/graph") || pathname.startsWith("/everyone") || pathname.startsWith("/topic")) return "discover";
  if (pathname.startsWith("/today") || pathname.startsWith("/recap")) {
    return "today";
  }
  if (pathname.startsWith("/drafts")) return "drafts";
  if (pathname.startsWith("/discover")) {
    return view === "sheet" ? "sheet" : "discover";
  }
  if (
    pathname.startsWith("/person") &&
    pathname.endsWith("/note")
  ) {
    return "mic";
  }
  if (pathname.startsWith("/person")) return "discover";
  return "today";
}
