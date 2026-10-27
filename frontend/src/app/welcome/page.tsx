"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, PhoneShell } from "@/components";
import { WELCOME_KEY } from "@/lib/welcome";

const steps = [
  {
    icon: "/design/icon-compass.svg",
    label: "Before",
    text: "Paste an event link. You’ll see who’s speaking and judging, ranked by the roles you’re targeting and what you care about. Mark the people you want to meet.",
  },
  {
    icon: "/design/icon-mic.svg",
    label: "At the event",
    text: "Open someone’s brief before you walk up. After you talk, tap the mic and say what you learned.",
  },
  {
    icon: "/design/icon-mail.svg",
    label: "After",
    text: "Kairos drafts a follow-up from your notes. You edit it and copy it into email or LinkedIn. It never sends anything.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  function start() {
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // storage unavailable: carry on
    }
    router.replace("/onboarding");
  }
  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-3 px-6 pt-6 pb-[max(20px,env(safe-area-inset-bottom))]">
        <h1 className="font-serif text-[36px] leading-tight">Here’s how it works</h1>
        <p className="text-[15px] text-muted">Three moments. Kairos helps with each one.</p>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.label} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream">
                  <Image src={step.icon} alt="" width={18} height={18} unoptimized />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{step.label}</span>
              </div>
              <p className="mt-3 text-[15px] leading-[1.45]">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Everything comes from public event pages and what you add. Your notes are only yours.
        </p>
        <div className="mt-auto pt-4">
          <Button variant="primary" fullWidth onClick={start}>Get started</Button>
        </div>
      </div>
    </PhoneShell>
  );
}
