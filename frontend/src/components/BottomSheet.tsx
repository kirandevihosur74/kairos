"use client";

import { useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { PhoneShell } from "./PhoneShell";

export function BottomSheet({ label, children, background, onClose, busy = false }: {
  label: string; children: ReactNode; background?: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const sheet = useRef<HTMLElement>(null);
  useEffect(() => { sheet.current?.focus(); }, []);
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = Array.from(sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []).filter((el) => el.getClientRects().length > 0);
    const first = controls[0]; const last = controls.at(-1);
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet.current)) { event.preventDefault(); first.focus(); }
  }
  return <PhoneShell withNavSpacer={false} fullBleed>
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ink">
      <div className="absolute inset-0" aria-hidden>{background}</div>
      <button type="button" disabled={busy} aria-label="Dismiss sheet" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-ink/45" />
      <div className="min-h-[18dvh] flex-1" />
      <section ref={sheet} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onKeyDown={keyDown} className="relative flex max-h-[82dvh] shrink-0 flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-card px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] focus:outline-none">
        <div aria-hidden className="mx-auto mb-5 h-1 w-10 shrink-0 rounded-full bg-line" />
        {children}
      </section>
    </div>
  </PhoneShell>;
}
