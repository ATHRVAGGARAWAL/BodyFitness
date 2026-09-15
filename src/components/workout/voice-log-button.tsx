"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Square, WandSparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { VoiceSetParse } from "@/lib/types";

/** `/api/ai/voice-set` answers with the parse on success, or `{ error, code }` on failure. */
type VoiceSetResponse = Partial<VoiceSetParse> & { error?: string; code?: string };

export function VoiceLogButton({ exerciseName, onParsed }: { exerciseName: string; onParsed: (result: VoiceSetParse) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const { showToast } = useAppChrome();
  const reduced = usePrefersReducedMotion();

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: preferred });
        await submit(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      showToast("Microphone permission is needed for voice logging");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setState("processing");
  }

  async function submit(blob: Blob) {
    try {
      const form = new FormData();
      form.append("audio", new File([blob], "set-log.webm", { type: blob.type }));
      form.append("activeExercise", exerciseName);
      const response = await fetch("/api/ai/voice-set", { method: "POST", body: form });
      const payload = (await response.json()) as VoiceSetResponse;
      if (!response.ok || typeof payload.transcript !== "string") throw new Error(payload.error || "Could not parse that set");
      onParsed({
        transcript: payload.transcript,
        weightKg: payload.weightKg ?? null,
        reps: payload.reps ?? null,
        confidence: payload.confidence ?? 0,
      });
      showToast(`Heard: “${payload.transcript}”`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not parse that set");
    } finally {
      setState("idle");
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={state === "recording" ? "Stop voice logging" : "Log set by voice"}
      onClick={state === "recording" ? stop : state === "idle" ? start : undefined}
      disabled={state === "processing"}
      className="relative shrink-0 overflow-hidden"
    >
      <AnimatePresence>
        {state === "recording" && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.04, 0.95] }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.2, repeat: reduced ? 0 : Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-brand-soft"
          />
        )}
      </AnimatePresence>
      <span className="relative flex items-center text-brand">
        {state === "recording" ? <Square size={11} fill="currentColor" /> : state === "processing" ? <WandSparkles /> : <Mic />}
      </span>
      <span className="relative">{state === "recording" ? "Listening…" : state === "processing" ? "Parsing…" : "Speak set"}</span>
    </Button>
  );
}
