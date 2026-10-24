import type { ReactNode } from "react";

export interface PhoneShellProps {
  children: ReactNode;
  withNavSpacer?: boolean;
  fullBleed?: boolean;
  className?: string;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function PhoneShell({
  children,
  withNavSpacer = true,
  fullBleed = false,
  className,
}: PhoneShellProps) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-paper">
      <div
        className={cn(
          "relative mx-auto flex h-full w-full max-w-[390px] flex-col bg-paper",
          !fullBleed && "pt-[max(12px,env(safe-area-inset-top))]",
          "sm:border-x sm:border-line",
          className,
        )}
      >
        <main className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
          withNavSpacer ? "pb-[var(--app-nav-height)]" : fullBleed ? "pb-0" : "pb-[max(12px,env(safe-area-inset-bottom))]",
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
