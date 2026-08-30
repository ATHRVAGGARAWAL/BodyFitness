import { useColorScheme } from "react-native";
import { designTokens } from "@bodyfitness/core";
import { useMobileStore } from "./store/mobile-store";

const dark = {
  ...designTokens,
  outside: "#050507",
  label: "#F7F6FB",
  secondary: "rgba(232,230,242,0.64)",
  tertiary: "rgba(220,217,232,0.38)",
  border: "rgba(255,255,255,0.09)",
  fill: "rgba(255,255,255,0.065)",
  accentSoft: "rgba(124,92,255,0.16)",
  tab: "rgba(14,14,20,0.96)",
} as const;

const light = {
  ...designTokens,
  background: "#F2F1F7",
  surface: "#FFFFFF",
  surfaceElevated: "#F8F7FC",
  outside: "#D8D7DF",
  label: "#111116",
  secondary: "rgba(35,34,43,0.64)",
  tertiary: "rgba(35,34,43,0.42)",
  border: "rgba(17,17,22,0.09)",
  fill: "rgba(17,17,22,0.055)",
  accent: "#6547E8",
  accentSoft: "rgba(101,71,232,0.12)",
  energy: "#E93666",
  protein: "#5E9400",
  steps: "#087FB4",
  success: "#21883A",
  warning: "#AD6400",
  danger: "#D72F3B",
  tab: "rgba(248,247,252,0.97)",
} as const;

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  outside: string;
  label: string;
  secondary: string;
  tertiary: string;
  border: string;
  fill: string;
  accent: string;
  accentSoft: string;
  energy: string;
  protein: string;
  steps: string;
  success: string;
  warning: string;
  danger: string;
  tab: string;
}

export function usePalette(): Palette {
  const system = useColorScheme();
  const preference = useMobileStore((state) => state.themePreference);
  return preference === "light" || (preference === "system" && system === "light")
    ? light
    : dark;
}

export const darkPalette = dark;
