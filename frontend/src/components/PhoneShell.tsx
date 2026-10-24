import type { ReactNode } from "react";

export interface PhoneShellProps {
  children: ReactNode;
  time?: string;
  withNavSpacer?: boolean;
  className?: string;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" fill="currentColor" className="h-3">
      <rect x="0" y="8" width="3" height="4" rx="0.5" />
      <rect x="5" y="6" width="3" height="6" rx="0.5" />
      <rect x="10" y="3" width="3" height="9" rx="0.5" />
      <rect x="15" y="0" width="3" height="12" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-3">
      <path d="M1 4.5a12 12 0 0 1 16 0" />
      <path d="M4 7.5a8 8 0 0 1 10 0" />
      <path d="M7 10.5a4 4 0 0 1 4 0" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 26 12" fill="none" className="h-3">
      <rect x="0.75" y="0.75" width="22" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="24" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" />
      <rect x="2.5" y="2.5" width="16" height="7" rx="1.25" fill="currentColor" />
    </svg>
  );
}

export function PhoneShell({
  children,
  time = "9:41",
  withNavSpacer = true,
  className,
}: PhoneShellProps) {
  return (
    <div className="min-h-dvh w-full bg-paper">
      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper",
          "sm:border-x sm:border-line",
          className,
        )}
      >
        <div className="flex h-11 shrink-0 items-center justify-between px-6 pt-2 text-[13px] font-medium text-ink">
          <span className="tracking-tight">{time}</span>
          <div className="flex items-center gap-1.5">
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </div>
        </div>

        <main className="relative flex flex-1 flex-col">
          {children}
          {withNavSpacer ? <div aria-hidden className="h-28 shrink-0" /> : null}
        </main>
      </div>
    </div>
  );
}
