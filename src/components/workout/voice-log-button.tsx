"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Square, WandSparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import type { VoiceSetParse } from "@/lib/types";

export function VoiceLogButton({ exerciseName, onParsed }: { exerciseName: string; onParsed: (result: VoiceSetParse) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const { showToast } = useAppChrome();

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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not parse that set");
      onParsed(payload as VoiceSetParse);
      showToast(`Heard: “${payload.transcript}”`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not parse that set");
    } finally {
      setState("idle");
    }
  }

  return (
    <button
      aria-label={state === "recording" ? "Stop voice logging" : "Log set by voice"}
      onClick={state === "recording" ? stop : state === "idle" ? start : undefined}
      disabled={state === "processing"}
      className="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-full bg-white/[0.07] px-3 text-xs font-semibold disabled:opacity-70"
    >
      <AnimatePresence>
        {state === "recording" && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.9, scale: 1.1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-[conic-gradient(from_90deg,#ff375f,#bf5af2,#64d2ff,#30d158,#ff375f)] blur-md"
          />
        )}
      </AnimatePresence>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black/65">
        {state === "recording" ? <Square size={11} fill="currentColor" /> : state === "processing" ? <WandSparkles size={15} /> : <Mic size={15} />}
      </span>
      <span className="relative">{state === "recording" ? "Listening…" : state === "processing" ? "Parsing…" : "Speak set"}</span>
    </button>
  );
}
