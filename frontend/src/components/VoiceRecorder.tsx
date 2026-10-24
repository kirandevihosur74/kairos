"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { DesignIcon } from "./DesignIcon";
import { ApiError, api } from "@/lib/api";

type State = "idle" | "requesting" | "recording" | "transcribing";
export interface VoiceRecorderProps {
  conferenceId: string; personId?: string; onTranscript: (text: string) => void;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
const MAX_SECONDS = 180;

export function VoiceRecorder({ conferenceId, personId, onTranscript, disabled, onBusyChange }: VoiceRecorderProps) {
  const [state, setState] = useState<State>("idle"); const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true); const starting = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
      const rec = recorder.current;
      if (rec) { rec.onstop = null; if (rec.state === "recording") rec.stop(); rec.stream.getTracks().forEach((track) => track.stop()); }
    };
  }, []);

  async function send(audio: Blob) {
    setState("transcribing");
    try {
      const result = await api.transcribeVoice(audio, conferenceId, personId);
      if (alive.current) onTranscript(result.text);
    } catch (err) {
      if (alive.current) setError(err instanceof ApiError && typeof err.detail === "string" ? err.detail : "Could not transcribe that. Try again or type your note.");
    } finally { if (alive.current) { setState("idle"); onBusyChange?.(false); } }
  }
  async function start() {
    if (starting.current || state !== "idle") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Recording is unavailable here. Use HTTPS or type your note."); return; }
    starting.current = true; setError(null); setState("requesting"); onBusyChange?.(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = () => {
        stream?.getTracks().forEach((track) => track.stop());
        if (timer.current) clearInterval(timer.current);
        if (alive.current) void send(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      recorder.current = rec; rec.start(); setSeconds(0); setState("recording");
      const began = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - began) / 1000); setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS && rec.state === "recording") rec.stop();
      }, 1000);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      if (alive.current) { setError("Could not start the microphone. Allow access or type your note."); setState("idle"); onBusyChange?.(false); }
    } finally { starting.current = false; }
  }
  function stop() { if (recorder.current?.state === "recording") recorder.current.stop(); }
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="space-y-2">
    <div className="flex min-h-14 items-center gap-3 rounded-xl bg-subtle px-4 py-3" role="status" aria-live="polite">
      <span className={state === "recording" ? "h-2.5 w-2.5 animate-pulse rounded-full bg-alert" : "text-muted"}>{state !== "recording" && <DesignIcon name="mic" />}</span>
      <span className="flex-1 text-sm">{state === "recording" ? `Recording · ${clock}` : state === "transcribing" ? "Transcribing…" : state === "requesting" ? "Waiting for microphone…" : "Dictate a note"}</span>
      <Button size="sm" className="h-9 border-line px-3 text-xs" disabled={disabled || state === "requesting" || state === "transcribing"} onClick={state === "recording" ? stop : () => void start()}>{state === "recording" ? "Stop" : "Record"}</Button>
    </div>
    {error && <p role="alert" className="text-xs text-alert">{error}</p>}
  </div>;
}
