"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef } from "react";
import { buildSyncEnvelope, fetchCircle, fetchCloudProfile, syncCloud, updateCloudProfile, uploadStepSnapshot } from "@/lib/cloud-sync";
import { localDateKey } from "@/lib/date";
import { useBodyFitnessStore } from "@/lib/store";

export function CloudSyncBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const hydrated = useBodyFitnessStore((state) => state.hydrated);
  const setAccountProfile = useBodyFitnessStore((state) => state.setAccountProfile);
  const setCircle = useBodyFitnessStore((state) => state.setCircle);
  const setSyncStatus = useBodyFitnessStore((state) => state.setSyncStatus);
  const applySyncRecords = useBodyFitnessStore((state) => state.applySyncRecords);
  const running = useRef(false);

  const runSync = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !hydrated || running.current) return;
    running.current = true;
    setSyncStatus("syncing", { error: null });
    try {
      const token = await getToken();
      if (!token) throw new Error("No active Clerk session");
      const initialState = useBodyFitnessStore.getState();
      const remoteProfile = await fetchCloudProfile(token);
      const hasLocalIdentity = initialState.account.profile.handle !== "athlete_local";
      const profile = hasLocalIdentity
        ? await updateCloudProfile(token, initialState.account.profile)
        : remoteProfile.displayName === "Athlete" && user
          ? await updateCloudProfile(token, {
              ...remoteProfile,
              displayName: user.fullName ?? user.firstName ?? "Athlete",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || remoteProfile.timezone,
            })
          : remoteProfile;
      setAccountProfile(profile);
      const state = useBodyFitnessStore.getState();
      const envelope = buildSyncEnvelope(state);
      const [syncResult, circle] = await Promise.all([
        syncCloud(token, envelope),
        fetchCircle(token),
      ]);
      const accepted = new Set(syncResult.accepted);
      const acceptedRecords = envelope.records.filter((item) => accepted.has(`${item.entity}:${item.entityId}`));
      applySyncRecords([...acceptedRecords, ...syncResult.remote, ...syncResult.conflicts]);
      const todayRecord = envelope.records.find((item) => item.entity === "daily-wellness" && item.entityId === localDateKey());
      if (todayRecord) {
        const source = todayRecord.payload.stepSource;
        if (source === "manual" || source === "apple-health" || source === "health-connect" || source === "cloud") {
          await uploadStepSnapshot(token, {
            date: todayRecord.entityId,
            steps: Math.max(0, Math.round(Number(todayRecord.payload.steps ?? 0))),
            source,
            deviceId: source === "manual" ? null : state.account.deviceId,
            syncedAt: typeof todayRecord.payload.stepSyncedAt === "string" ? todayRecord.payload.stepSyncedAt : todayRecord.updatedAt,
            isManualOverride: Boolean(todayRecord.payload.manualStepOverride),
          });
        }
      }
      setCircle(circle);
      setSyncStatus("synced", {
        syncedAt: syncResult.syncedAt,
        cursor: syncResult.cursor,
        error: null,
      });
    } catch (error) {
      setSyncStatus("error", {
        error: error instanceof Error ? error.message : "Cloud sync failed",
      });
    } finally {
      running.current = false;
    }
  }, [applySyncRecords, getToken, hydrated, isLoaded, isSignedIn, setAccountProfile, setCircle, setSyncStatus, user]);

  useEffect(() => {
    if (!isSignedIn) {
      if (isLoaded) setSyncStatus("local", { error: null });
      return;
    }
    void runSync();
    const interval = window.setInterval(() => void runSync(), 60_000);
    const onOnline = () => void runSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLoaded, isSignedIn, runSync, setSyncStatus]);

  return null;
}
