"use client";

import Image from "next/image";
import { useState } from "react";
import { Avatar } from "./Avatar";

/** Roster imagery stays dynamic; unavailable photos fall back to initials. */
export function Portrait({ name, src }: { name: string; src: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? (
    <Image src={src} alt={name} fill sizes="(max-width: 390px) 92vw, 358px" className="object-cover" unoptimized onError={() => setFailedSrc(src)} />
  ) : (
    <div className="flex h-full items-center justify-center bg-subtle"><Avatar name={name} size="ring" /></div>
  );
}
