import type { ReactNode } from "react";

export interface PhoneShellProps {
  children: ReactNode;
  withNavSpacer?: boolean;
  className?: string;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function PhoneShell({
  children,
  withNavSpacer = true,
  className,
}: PhoneShellProps) {
  return (
    <div className="min-h-dvh w-full bg-paper">
      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-paper pt-[max(12px,env(safe-area-inset-top))]",
          "sm:border-x sm:border-line",
          className,
        )}
      >
        <main className="relative flex flex-1 flex-col">
          {children}
          {withNavSpacer ? <div aria-hidden className="h-28 shrink-0" /> : null}
        </main>
      </div>
    </div>
  );
}
