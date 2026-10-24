"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { ApiError, api } from "@/lib/api";

type State = "idle" | "recording" | "transcribing";

export interface VoiceRecorderProps {
  conferenceId: string;
  personId?: string;
  /** Called with the transcript; nothing is saved until the user submits the note. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// iOS Safari records mp4; Chrome and Android record webm. Both are accepted by the backend.
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
const MAX_SECONDS = 180;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function VoiceRecorder({ conferenceId, personId, onTranscript, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice needs a secure (https) page. Type the note instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings, or type the note.");
      return;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      void send(new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" }));
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) recorder.current?.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function send(audio: Blob) {
    setState("transcribing");
    try {
      const result = await api.transcribeVoice(audio, conferenceId, personId);
      onTranscript(result.text);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.detail === "string"
          ? err.detail
          : "Could not transcribe that. Try again or type the note.",
      );
    } finally {
      setState("idle");
    }
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={state === "recording" ? "primary" : "secondary"}
        size="md"
        fullWidth
        disabled={disabled || state === "transcribing"}
        onClick={state === "recording" ? stop : () => void start()}
        aria-live="polite"
      >
        {state === "recording"
          ? `Stop · ${clock}`
          : state === "transcribing"
            ? "Transcribing…"
            : "Dictate note"}
      </Button>
      {error ? <p className="text-[12px] text-alert">{error}</p> : null}
    </div>
  );
}
