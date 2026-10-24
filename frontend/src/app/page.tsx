import Link from "next/link";
import { PhoneShell } from "@/components";

export default function Home() {
  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col justify-between px-6 pb-10 pt-6">
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Kairos
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] text-ink">
            Make the room worth it.
          </h1>
          <p className="text-sm text-muted">
            Foundation only. Screens come later. Preview the design system below.
          </p>
        </div>

        <Link
          href="/styleguide"
          className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-card px-5 text-[15px] font-medium text-ink"
        >
          Open styleguide
        </Link>
      </div>
    </PhoneShell>
  );
}
