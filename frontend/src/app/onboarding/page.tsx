"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Button, Chip, PhoneShell, SectionLabel } from "@/components";
import { api } from "@/lib/api";
import {
  applyPreview,
  dedupe,
  describeError,
  emptyDraft,
  readStoredDraft,
  writeStoredDraft,
  type Draft,
} from "./draft";

type Mode = "idle" | "paste";
type FieldKey = "target_roles" | "interests" | "skills";

function CheckBadge() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block h-[14px] w-[14px] text-[#0f7b3f]"
      aria-hidden
    >
      <path d="M2.5 7.5l3 3 6-6.5" />
    </svg>
  );
}

interface InlineChipGridProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}

function InlineChipGrid({ values, onChange, placeholder }: InlineChipGridProps) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const commit = () => {
    const parts = input
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) onChange(dedupe([...values, ...parts]));
    setInput("");
    setAdding(false);
  };

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {values.map((value) => (
        <Chip
          key={value}
          tone="on"
          className="cursor-pointer"
          onClick={() => remove(value)}
          role="button"
          aria-label={`Remove ${value}`}
        >
          {value} <span className="text-muted">✕</span>
        </Chip>
      ))}
      {adding ? (
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-[120px] rounded-full border border-dashed border-ink bg-transparent px-3 py-[7px] text-[13px] font-medium text-ink placeholder:text-faint focus:outline-none"
        />
      ) : (
        <Chip
          tone="suggest"
          className="cursor-pointer"
          onClick={() => setAdding(true)}
          role="button"
          aria-label="Add"
        >
          + Add
        </Chip>
      )}
    </div>
  );
}

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

  const setField = (key: FieldKey, next: string[]) => {
    persist({ ...draft, [key]: next });
  };

  const runImportText = async () => {
    if (!pasteText.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const preview = await api.importText("resume_text", pasteText);
      persist(applyPreview(draft, preview, draft.resumeFileName ?? "Pasted summary"));
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
          <Chip tone="outline" className="mt-1 text-[12px]">
            Step 1 of 3
          </Chip>
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
              <span className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-[#0f7b3f]">
                Read <CheckBadge />
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

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink">Name</p>
            <input
              value={draft.name}
              onChange={(e) => persist({ ...draft, name: e.target.value })}
              placeholder="Your name"
              className="rounded-[12px] border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Target roles</SectionLabel>
            <InlineChipGrid
              values={draft.target_roles}
              onChange={(next) => setField("target_roles", next)}
              placeholder="e.g. Backend engineer"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Interests · used for ranking</SectionLabel>
            <InlineChipGrid
              values={draft.interests}
              onChange={(next) => setField("interests", next)}
              placeholder="e.g. distributed systems"
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel>Skills</SectionLabel>
            <InlineChipGrid
              values={draft.skills}
              onChange={(next) => setField("skills", next)}
              placeholder="e.g. python, fastapi"
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
