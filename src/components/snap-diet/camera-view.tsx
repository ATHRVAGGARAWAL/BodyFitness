"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, Sparkles, X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiClientError, analyzeMeal, type FoodResult } from "@/lib/ai/client";
import type { FoodContext } from "@/lib/ai/schemas";
import { fade, reduceable, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Full-screen live capture. Secondary to text-first logging on the web, but kept for
 * phones: frame the plate, shoot, and the photo goes straight to the estimator.
 * Chrome is always dark (`data-theme="dark"` + `.camera-surface`) regardless of theme.
 */
export function CameraView({
  context,
  onClose,
  onResult,
}: {
  context: FoodContext;
  onClose: () => void;
  onResult: (analysis: FoodResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { setCameraActive, showToast } = useAppChrome();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    setCameraActive(true);
    let cancelled = false;

    async function startCamera() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setReady(false);
        showToast("Camera unavailable — choose a photo instead");
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    };
  }, [facingMode, setCameraActive, showToast]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch((value) => !value);
    } catch {
      showToast("Flash is not available on this camera");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      fileRef.current?.click();
      return;
    }
    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (blob) await analyze(blob);
  }

  async function analyze(blob: Blob) {
    setAnalyzing(true);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    try {
      const result = await analyzeMeal({ image: blob, context });
      onResult(result);
    } catch (error) {
      showToast(error instanceof AiClientError ? error.message : "Could not analyze this meal");
      setPreviewUrl(null);
    } finally {
      setAnalyzing(false);
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
    }
  }

  return (
    <motion.div
      data-theme="dark"
      variants={fade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="camera-surface fixed inset-0 z-[70] overflow-hidden bg-background text-foreground"
    >
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      {!ready && !previewUrl && <div className="absolute inset-0 bg-background" />}
      {/* Blob URLs are local camera frames and cannot be optimized by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previewUrl && <img src={previewUrl} alt="Captured meal" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-background/60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-background/70" />

      <div className="absolute inset-x-0 top-0 pt-[calc(var(--safe-top)+12px)]">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-4">
          <Button variant="secondary" size="icon" aria-label="Close camera" onClick={onClose}><X /></Button>
          <Badge variant="brand"><Sparkles size={11} /> {ready ? "Camera ready" : "Starting camera"}</Badge>
          <Button variant="secondary" size="icon" aria-label="Toggle flash" aria-pressed={torch} onClick={toggleTorch}>
            {torch ? <Zap fill="currentColor" /> : <ZapOff />}
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[18%] h-[48%]">
        <div className="relative mx-auto h-full w-full max-w-[480px] px-6">
          <div className="relative h-full w-full rounded-xl border border-border">
            <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-brand" />
            <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-xl border-r-2 border-t-2 border-brand" />
            <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-xl border-b-2 border-l-2 border-brand" />
            <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-brand" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-[calc(28px+var(--safe-bottom))]">
        <div className="mx-auto w-full max-w-[480px] px-6">
          <p className="mb-6 text-center text-sm leading-5 text-muted-foreground">
            Keep the full plate in frame. Hidden oil and standard portions are accounted for.
          </p>
          <div className="flex items-center justify-between px-2">
            <Button variant="secondary" size="icon" className="size-11" aria-label="Choose from photos" onClick={() => fileRef.current?.click()}><ImagePlus /></Button>
            <button
              type="button"
              aria-label="Take photo"
              disabled={analyzing}
              onClick={capture}
              className="pressable flex size-[72px] items-center justify-center rounded-2xl border-2 border-foreground bg-muted disabled:opacity-60"
            >
              <span className="size-14 rounded-xl bg-foreground" />
            </button>
            <Button variant="secondary" size="icon" className="size-11" aria-label="Flip camera" onClick={() => setFacingMode((value) => (value === "environment" ? "user" : "environment"))}><RotateCcw /></Button>
          </div>
        </div>
      </div>

      <input ref={fileRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void analyze(file);
        event.currentTarget.value = "";
      }} />

      <AnimatePresence>
        {analyzing && (
          <motion.div variants={fade} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 flex flex-col items-center justify-center bg-background/70">
            <div className="relative size-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={reduceable({ duration: 1.2, repeat: reduced ? 0 : Infinity, ease: "linear" }, reduced)}
                className="absolute inset-0 rounded-2xl border-2 border-brand border-r-transparent"
              />
              <div className="absolute inset-2 flex items-center justify-center rounded-xl bg-card text-foreground">
                <Camera size={22} />
              </div>
            </div>
            <p className="mt-5 text-lg font-semibold">Reading your plate…</p>
            <p className="mt-1 text-sm text-muted-foreground">Estimating portions and hidden oils</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
