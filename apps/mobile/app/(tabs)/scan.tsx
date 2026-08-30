import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { webBaseUrl } from "../../src/api/client";
import { AppButton, Card, PageHeader, Screen } from "../../src/components/ui";
import { useMobileStore } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

interface FoodAnalysis {
  name: string;
  items: Array<{ name: string; portion: string; calories: number; proteinG: number; carbsG: number; fatG: number }>;
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  confidence: number;
  assumptions: string[];
}

export default function ScanScreen() {
  const palette = usePalette();
  const addMeal = useMobileStore((state) => state.addMeal);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const capture = async () => {
    const picture = await cameraRef.current?.takePictureAsync({ quality: 0.72, shutterSound: false });
    if (!picture) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhoto({ uri: picture.uri, type: "image/jpeg", name: `meal-${Date.now()}.jpg` });
    setAnalysis(null);
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPhoto({ uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? `meal-${Date.now()}.jpg` });
    setAnalysis(null);
  };

  const analyze = async () => {
    if (!photo) return;
    if (!webBaseUrl) return setMessage("Set EXPO_PUBLIC_WEB_URL to use meal analysis.");
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("image", { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
      const response = await fetch(`${webBaseUrl}/api/ai/food`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Meal analysis failed.");
      setAnalysis(body as FoodAnalysis);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Meal analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!analysis) return;
    addMeal({ name: analysis.name, ...analysis.totals });
    setPhoto(null);
    setAnalysis(null);
    setMessage("Meal added to today’s local log.");
  };

  return (
    <Screen>
      <PageHeader eyebrow="Private photo analysis" title="Scan" />
      {!photo ? (
        permission?.granted ? <View style={[styles.cameraShell, { borderColor: palette.border }]}><CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" /><View style={styles.cameraOverlay}><View style={styles.guide} /><Pressable accessibilityRole="button" accessibilityLabel="Take meal photo" onPress={() => void capture()} style={styles.shutter}><View style={styles.shutterInner} /></Pressable></View></View> : <Card style={styles.permissionCard}><Ionicons name="camera" size={31} color={palette.accent} /><Text style={[styles.permissionTitle, { color: palette.label }]}>Photograph a meal when you choose</Text><Text style={[styles.permissionBody, { color: palette.secondary }]}>Camera access is requested only after you tap below. Images are analyzed in transit and the photo is not added to your cloud history.</Text><AppButton label="Enable camera" onPress={() => void requestPermission()} /></Card>
      ) : <View style={[styles.preview, { borderColor: palette.border }]}><Image alt="Captured meal awaiting nutrition analysis" source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /><Pressable accessibilityLabel="Discard photo" onPress={() => { setPhoto(null); setAnalysis(null); }} style={styles.close}><Ionicons name="close" size={22} color="#FFF" /></Pressable></View>}

      {!photo ? <AppButton label="Choose from photo library" variant="secondary" onPress={() => void choosePhoto()} /> : <AppButton disabled={busy} label={busy ? "Analyzing meal…" : "Analyze nutrition"} onPress={() => void analyze()} />}
      {busy ? <ActivityIndicator color={palette.accent} /> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: palette.secondary }]}>{message}</Text> : null}
      {analysis ? <Card style={styles.result}><View style={styles.resultHeader}><View><Text style={[styles.resultTitle, { color: palette.label }]}>{analysis.name}</Text><Text style={[styles.confidence, { color: palette.tertiary }]}>{Math.round(analysis.confidence * 100)}% model confidence · edit on the web if needed</Text></View><Text style={[styles.calories, { color: palette.energy }]}>{Math.round(analysis.totals.calories)} kcal</Text></View><View style={styles.macros}>{[["PROTEIN", analysis.totals.proteinG, palette.protein], ["CARBS", analysis.totals.carbsG, palette.steps], ["FAT", analysis.totals.fatG, palette.warning]].map(([label, value, color]) => <View key={String(label)} style={[styles.macro, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}><Text style={[styles.macroValue, { color: String(color) }]}>{Math.round(Number(value))}g</Text><Text style={[styles.macroLabel, { color: palette.tertiary }]}>{label}</Text></View>)}</View>{analysis.items.map((item) => <View key={`${item.name}-${item.portion}`} style={[styles.foodRow, { borderBottomColor: palette.border }]}><View style={{ flex: 1 }}><Text style={[styles.foodName, { color: palette.label }]}>{item.name}</Text><Text style={[styles.foodPortion, { color: palette.tertiary }]}>{item.portion}</Text></View><Text style={[styles.foodCalories, { color: palette.secondary }]}>{Math.round(item.calories)} kcal</Text></View>)}<AppButton label="Add meal" onPress={save} /></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraShell: { height: 430, overflow: "hidden", borderWidth: 1, borderRadius: 24, backgroundColor: "#000" }, cameraOverlay: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 28 }, guide: { marginTop: 65, width: "76%", height: 195, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.72)", borderRadius: 26 }, shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#FFF", padding: 5 }, shutterInner: { flex: 1, borderRadius: 29, backgroundColor: "#FFF" },
  permissionCard: { alignItems: "center", gap: 12, paddingVertical: 25 }, permissionTitle: { fontSize: 19, fontWeight: "900" }, permissionBody: { maxWidth: 310, textAlign: "center", fontSize: 12, lineHeight: 18 },
  preview: { height: 380, overflow: "hidden", borderWidth: 1, borderRadius: 24 }, close: { position: "absolute", right: 13, top: 13, width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.56)" },
  message: { textAlign: "center", fontSize: 11, lineHeight: 16 }, result: { gap: 13 }, resultHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, resultTitle: { fontSize: 19, fontWeight: "900" }, confidence: { marginTop: 4, fontSize: 9 }, calories: { fontSize: 17, fontWeight: "900" }, macros: { flexDirection: "row", gap: 8 }, macro: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 11 }, macroValue: { fontSize: 17, fontWeight: "900" }, macroLabel: { marginTop: 3, fontSize: 8, fontWeight: "900" }, foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth }, foodName: { fontSize: 12, fontWeight: "800" }, foodPortion: { marginTop: 2, fontSize: 9 }, foodCalories: { fontSize: 11, fontWeight: "700" },
});
