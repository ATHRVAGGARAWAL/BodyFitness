import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { healthSourceLabel } from "@bodyfitness/core";
import type { HealthSource } from "@bodyfitness/contracts";
import { relativeFreshness } from "../lib/date";
import { usePalette } from "../theme";

export function Screen({ children, scroll = true, contentStyle }: { children: ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: palette.background }]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.secondary }]}>{eyebrow.toUpperCase()}</Text>
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: palette.label }]}>{title}<Text style={{ color: palette.accent }}>.</Text></Text>
      </View>
      {action}
    </View>
  );
}

export function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  const palette = usePalette();
  return <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: palette.label }]}>{title}</Text>{caption ? <Text style={[styles.caption, { color: palette.tertiary }]}>{caption}</Text> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>{children}</View>;
}

export function DataTile({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return <View style={[styles.dataTile, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }, style]}>{children}</View>;
}

export function AppButton({ label, variant = "primary", style, disabled, ...props }: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  const backgroundColor = variant === "primary" ? palette.accent : variant === "danger" ? `${palette.danger}20` : palette.surfaceElevated;
  const color = variant === "primary" ? "#FFFFFF" : variant === "danger" ? palette.danger : palette.label;
  return <Pressable accessibilityRole="button" disabled={disabled} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: variant === "primary" ? palette.accent : palette.border, opacity: disabled ? 0.45 : pressed ? 0.76 : 1 }, style]} {...props}><Text style={[styles.buttonLabel, { color }]}>{label}</Text></Pressable>;
}

export function SourceBadge({ source, syncedAt }: { source: HealthSource | null; syncedAt: string | null }) {
  const palette = usePalette();
  return <View style={[styles.badge, { backgroundColor: palette.fill, borderColor: palette.border }]}><Text style={[styles.badgeText, { color: palette.secondary }]}>{healthSourceLabel(source)} · {relativeFreshness(syncedAt)}</Text></View>;
}

export function ProgressRing({ value, target, size = 164 }: { value: number; target: number; size?: number }) {
  const palette = usePalette();
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, target > 0 ? value / target : 0);
  return (
    <View accessible accessibilityLabel={`${value.toLocaleString()} of ${target.toLocaleString()} steps`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={palette.fill} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={palette.steps} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text style={[styles.ringValue, { color: palette.label }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.ringLabel, { color: palette.tertiary }]}>OF {target.toLocaleString()} STEPS</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const palette = usePalette();
  return <Card style={styles.empty}><Text style={[styles.emptyTitle, { color: palette.label }]}>{title}</Text><Text style={[styles.emptyBody, { color: palette.secondary }]}>{body}</Text></Card>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 122 },
  content: { paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  pageTitle: { marginTop: 6, fontSize: 38, lineHeight: 42, fontWeight: "900", letterSpacing: -1.8 },
  sectionHeader: { marginTop: 9 },
  sectionTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6 },
  caption: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: 16 },
  dataTile: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 13 },
  button: { minHeight: 50, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonLabel: { fontSize: 13, fontWeight: "800" },
  badge: { alignSelf: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  ringValue: { fontSize: 35, lineHeight: 40, fontWeight: "900", letterSpacing: -1.6, fontVariant: ["tabular-nums"] },
  ringLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyBody: { marginTop: 7, maxWidth: 290, textAlign: "center", fontSize: 12, lineHeight: 18 },
});
