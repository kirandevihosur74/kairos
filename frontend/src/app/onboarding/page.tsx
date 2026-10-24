"use client";

import { Logo } from "@/components/Logo";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Button, PhoneShell } from "@/components";
import { api } from "@/lib/api";
import {
  applyPreview,
  describeError,
  emptyDraft,
  readStoredDraft,
  writeStoredDraft,
  type Draft,
} from "./draft";

type Mode = "idle" | "paste";

export default function OnboardingImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(() => readStoredDraft());
  const [mode, setMode] = useState<Mode>("idle");
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = (next: Draft) => {
    setDraft(next);
    writeStoredDraft(next);
  };

  const runImportText = async () => {
    if (!pasteText.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const preview = await api.importText("resume_text", pasteText);
      persist(applyPreview(draft, preview, draft.resumeFileName ?? null));
      setPasteText("");
      setMode("idle");
    } catch (err) {
      setError(describeError(err, "Could not import that text."));
    } finally {
      setImporting(false);
    }
  };

  const runImportFile = async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const preview = await api.importResume(file);
      persist(applyPreview(draft, preview, file.name));
    } catch (err) {
      setError(describeError(err, "Could not read that resume."));
    } finally {
      setImporting(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void runImportFile(file);
    // Reset so re-selecting the same file still fires change.
    e.target.value = "";
  };

  const onContinue = () => {
    persist(draft);
    router.push("/onboarding/goal");
  };

  const onEnterManually = () => {
    persist({ ...emptyDraft, ...draft });
    router.push("/onboarding/goal");
  };

  const hasPreview = draft.import_id !== null || !!draft.resumeFileName;
  const canContinue = hasPreview;

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-5 px-5 pb-0 pt-2">
        <div className="flex items-start justify-between gap-3 pt-1">
          <Logo />
          <p className="pt-2 text-[13px] text-muted">Step 1 of 3</p>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
            Start with your resume.
          </h1>
          <p className="text-[15px] leading-[1.45] text-muted">
            Upload a PDF or paste a summary. We suggest fields; nothing is saved
            until you confirm.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {draft.resumeFileName ? (
            <div className="flex items-start justify-between rounded-[12px] border border-dashed border-line bg-card px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-medium text-ink">
                  {draft.resumeFileName}
                </p>
                <p className="text-[13px] text-muted">
                  Text-based PDF, up to 2 MB and 10 pages
                </p>
              </div>
              <span className="pt-1 text-[13px] font-semibold text-[#0f7b3f]">
                Read ✓
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                  className="flex-1 rounded-[12px] border border-dashed border-line bg-card px-4 py-3 text-left hover:border-ink disabled:opacity-60"
                >
                  <span className="block text-[15px] font-medium text-ink">
                    Upload resume
                  </span>
                  <span className="block text-[13px] text-muted">
                    {importing ? "Reading…" : "PDF, up to 2 MB and 10 pages"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode(mode === "paste" ? "idle" : "paste")}
                  disabled={importing}
                  className="flex-1 rounded-[12px] border border-dashed border-line bg-card px-4 py-3 text-left disabled:opacity-60"
                >
                  <span className="block text-[15px] font-medium text-ink">
                    Paste a summary
                  </span>
                  <span className="block text-[13px] text-muted">
                    A short bio or role brief
                  </span>
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {mode === "paste" && !draft.resumeFileName ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={3}
                placeholder="Paste a quick summary of your experience, roles you want, and what you work on."
                className="rounded-[12px] border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={() => void runImportText()}
                disabled={importing || !pasteText.trim()}
              >
                {importing ? "Reading…" : "Suggest fields from this"}
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-[12px] border border-alert/40 bg-alert/5 px-3 py-2 text-[13px] text-alert">
            {error}
          </div>
        ) : null}

        {hasPreview && (
          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-[13px] font-semibold">Ready to review</h2>
            {draft.name && <p className="mt-2 font-serif text-2xl">{draft.name}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.skills.slice(0, 6).map((skill) => <span key={skill} className="rounded-full bg-cream px-3 py-1.5 text-xs">{skill}</span>)}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">Review your roles, interests, and profile on the next step. Nothing is saved until you confirm.</p>
          </section>
        )}

        <div className="app-actions mt-auto flex flex-col gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={onEnterManually}>
            Enter manually
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onContinue}
            disabled={!canContinue}
            trailing={<span aria-hidden>→</span>}
          >
            Review and continue
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}
