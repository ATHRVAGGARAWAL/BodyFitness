import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { usePalette } from "../../src/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabLayout() {
  const palette = usePalette();
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      sceneStyle: { backgroundColor: palette.background },
      tabBarActiveTintColor: palette.label,
      tabBarInactiveTintColor: palette.tertiary,
      tabBarHideOnKeyboard: true,
      tabBarLabelStyle: { fontSize: 9, fontWeight: "800", marginTop: 1 },
      tabBarItemStyle: { paddingTop: 7 },
      tabBarStyle: { position: "absolute", left: 10, right: 10, bottom: 8, height: 76, paddingBottom: 8, borderTopWidth: 0, borderWidth: 1, borderColor: palette.border, borderRadius: 24, backgroundColor: palette.tab, elevation: 14, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
      tabBarIcon: ({ color, focused, size }) => <Ionicons name={iconForRoute(route.name, focused)} color={color} size={route.name === "scan" ? size + 4 : size} />,
    })}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="workout" options={{ title: "Workout" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

function iconForRoute(route: string, focused: boolean): IconName {
  const icons: Record<string, [IconName, IconName]> = {
    index: ["home-outline", "home"],
    workout: ["barbell-outline", "barbell"],
    scan: ["scan-outline", "scan"],
    progress: ["stats-chart-outline", "stats-chart"],
    profile: ["person-circle-outline", "person-circle"],
  };
  return icons[route]?.[focused ? 1 : 0] ?? "ellipse-outline";
}
