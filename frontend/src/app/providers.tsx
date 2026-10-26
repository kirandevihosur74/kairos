"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/Toast";
import { AuthBridge } from "@/components/AuthBridge";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AuthBridge />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
