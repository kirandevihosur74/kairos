"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, PhoneShell, SectionLabel } from "@/components";
import { api } from "@/lib/api";
import { ChipField } from "./ChipField";
import {
  applyPreview,
  describeError,
  emptyDraft,
  profileToDraft,
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

  // Editing an existing profile: start from the saved one, not a blank form.
  useEffect(() => {
    if (draft.name || draft.interests.length) return;
    let cancelled = false;
    api.getProfile().then(
      (profile) => {
        if (!cancelled) persist(profileToDraft(profile));
      },
      () => {
        // No profile yet (409): first-time onboarding starts blank.
      },
    );
    return () => {
      cancelled = true;
    };
    // Runs once on open; later edits must not be overwritten by the saved profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const canContinue = draft.name.trim().length > 0 || hasPreview;

  return (
    <PhoneShell withNavSpacer={false}>
      <div className="flex flex-1 flex-col gap-6 px-5 pb-10 pt-2">
        <div className="flex items-start justify-between gap-3 pt-1">
          <p className="font-serif text-[24px] leading-none text-ink">kairos</p>
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
                rows={5}
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

        <div className="flex flex-col gap-4">
          <SectionLabel>
            {hasPreview
              ? "Suggested from your resume · confirm or remove"
              : "Fill these in — or import above"}
          </SectionLabel>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink">Name</p>
            <input
              value={draft.name}
              onChange={(e) => persist({ ...draft, name: e.target.value })}
              placeholder="Your name"
              className="rounded-[12px] border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            />
          </div>

          <ChipField
            label="Target roles"
            values={draft.target_roles}
            onChange={(target_roles) => persist({ ...draft, target_roles })}
            placeholder="e.g. Backend engineer"
          />

          <ChipField
            label="Interests"
            helper="used to rank who you meet"
            values={draft.interests}
            onChange={(interests) => persist({ ...draft, interests })}
            placeholder="e.g. distributed systems"
          />

          <ChipField
            label="Skills"
            values={draft.skills}
            onChange={(skills) => persist({ ...draft, skills })}
            placeholder="e.g. python, fastapi"
          />

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink">About you</p>
            <textarea
              value={draft.background}
              onChange={(e) => persist({ ...draft, background: e.target.value })}
              rows={3}
              placeholder="One line on what you build and where you want to go."
              className="rounded-[12px] border border-line bg-card px-4 py-3 text-[14px] leading-[1.4] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            />
          </div>

          <p className="text-[12px] text-faint">
            Keyword matching only, no AI guessing. You stay in control of what
            ranks.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-6">
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
