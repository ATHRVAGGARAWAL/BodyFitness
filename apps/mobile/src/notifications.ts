import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useMobileStore } from "./store/mobile-store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export async function enablePushNotifications() {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted.");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("activity", { name: "Circle and activity", importance: Notifications.AndroidImportance.DEFAULT });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || String(projectId).startsWith("REPLACE_")) throw new Error("Add the EAS project ID before registering push notifications.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) })).data;
  useMobileStore.getState().setPushToken(token);
  return token;
}
