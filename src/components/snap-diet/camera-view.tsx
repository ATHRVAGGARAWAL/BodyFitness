"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, Sparkles, X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import type { FoodAnalysis } from "@/lib/types";

export function CameraView({
  onClose,
  onResult,
}: {
  onClose: () => void;
  onResult: (analysis: FoodAnalysis) => void;
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
      const form = new FormData();
      form.append("image", new File([blob], "mess-meal.jpg", { type: blob.type || "image/jpeg" }));
      const response = await fetch("/api/ai/food", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not analyze this meal");
      onResult(payload as FoodAnalysis);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not analyze this meal");
      setPreviewUrl(null);
    } finally {
      setAnalyzing(false);
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="camera-surface fixed inset-0 z-[70] mx-auto max-w-[430px] overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      {!ready && !previewUrl && (
        <div className="absolute inset-0 bg-[#101012]" />
      )}
      {/* Blob URLs are local camera frames and cannot be optimized by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previewUrl && <img src={previewUrl} alt="Captured meal" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(var(--safe-top)+12px)]">
        <CircleButton label="Close camera" onClick={onClose}><X size={20} /></CircleButton>
        <div className="glass flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold">
          <Sparkles size={14} className="text-[#ffd60a]" /> Indian mess AI
        </div>
        <CircleButton label="Toggle flash" onClick={toggleTorch}>{torch ? <Zap size={19} fill="currentColor" /> : <ZapOff size={19} />}</CircleButton>
      </div>

      <div className="pointer-events-none absolute left-6 right-6 top-[18%] h-[48%] rounded-[30px] border border-white/35 shadow-[inset_0_0_0_1px_rgba(0,0,0,.18)]">
        <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-[30px] border-l-2 border-t-2 border-white" />
        <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-[30px] border-r-2 border-t-2 border-white" />
        <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-[30px] border-b-2 border-l-2 border-white" />
        <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-[30px] border-b-2 border-r-2 border-white" />
      </div>
      <p className="absolute inset-x-10 bottom-[185px] text-center text-xs font-medium leading-5 text-white/70">
        Keep the full plate in frame. We’ll account for hidden oil and standard mess portions.
      </p>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-[calc(30px+var(--safe-bottom))]">
        <CircleButton label="Choose from photos" onClick={() => fileRef.current?.click()} large><ImagePlus size={22} /></CircleButton>
        <button
          aria-label="Take photo"
          disabled={analyzing}
          onClick={capture}
          className="relative flex h-[82px] w-[82px] items-center justify-center rounded-full border-[5px] border-white bg-white/20 shadow-2xl backdrop-blur-md active:scale-95 disabled:opacity-60"
        >
          <span className="h-[62px] w-[62px] rounded-full bg-white" />
        </button>
        <CircleButton label="Flip camera" onClick={() => setFacingMode((value) => value === "environment" ? "user" : "environment")} large><RotateCcw size={22} /></CircleButton>
      </div>

      <input ref={fileRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void analyze(file);
        event.currentTarget.value = "";
      }} />

      <AnimatePresence>
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/38 backdrop-blur-md">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(#ff375f,#ffd60a,#30d158,#64d2ff,#bf5af2,#ff375f)] blur-lg opacity-80" style={{ animation: "siri-orbit 1.25s linear infinite" }} />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-black/85">
                <Camera size={25} />
              </div>
            </div>
            <p className="mt-5 text-[17px] font-semibold">Reading your plate…</p>
            <p className="mt-1 text-xs text-white/45">Estimating portions and hidden oils</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CircleButton({ label, onClick, children, large = false }: { label: string; onClick: () => void; children: React.ReactNode; large?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} className={`glass flex items-center justify-center rounded-full ${large ? "h-12 w-12" : "h-10 w-10"}`}>
      {children}
    </button>
  );
}
