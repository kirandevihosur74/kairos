import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextFetchEvent, NextRequest } from "next/server";

const clerk = clerkMiddleware();

// Behind a hosting proxy (Spawnpoint) the app receives requests for its internal host over plain http, and
// Clerk builds its sign-in redirects from that: visitors were sent to http://<internal-host>/, which phones
// can't open. When the public origin is configured, tell Clerk the address people actually use.
const PUBLIC_ORIGIN = process.env.KAIROS_FRONTEND_ORIGIN ? new URL(process.env.KAIROS_FRONTEND_ORIGIN) : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!PUBLIC_ORIGIN) return clerk(request, event);
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", PUBLIC_ORIGIN.host);
  headers.set("x-forwarded-proto", PUBLIC_ORIGIN.protocol.replace(":", ""));
  return clerk(new NextRequest(request, { headers }), event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
