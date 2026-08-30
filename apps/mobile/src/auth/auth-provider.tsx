import { ClerkProvider, useAuth as useClerkAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useMobileStore } from "../store/mobile-store";

export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
export const clerkConfigured = clerkPublishableKey.startsWith("pk_");
export const BACKGROUND_TOKEN_KEY = "bodyfitness-background-bearer";

interface AppAuthState {
  configured: boolean;
  loaded: boolean;
  signedIn: boolean;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteIdentity: () => Promise<void>;
}

const guestAuth: AppAuthState = {
  configured: false,
  loaded: true,
  signedIn: false,
  userId: null,
  displayName: null,
  email: null,
  getToken: async () => null,
  signOut: async () => undefined,
  deleteIdentity: async () => undefined,
};

const AuthContext = createContext<AppAuthState>(guestAuth);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (!clerkConfigured) return <AuthContext.Provider value={guestAuth}>{children}</AuthContext.Provider>;
  return <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}><ClerkBridge>{children}</ClerkBridge></ClerkProvider>;
}

function ClerkBridge({ children }: { children: ReactNode }) {
  const auth = useClerkAuth();
  const { user } = useUser();
  const resetCloudState = useMobileStore((state) => state.resetCloudState);

  const getToken = useCallback(async () => {
    const value = await auth.getToken();
    if (value) await SecureStore.setItemAsync(BACKGROUND_TOKEN_KEY, value);
    return value;
  }, [auth]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    await SecureStore.deleteItemAsync(BACKGROUND_TOKEN_KEY);
    resetCloudState();
  }, [auth, resetCloudState]);

  const deleteIdentity = useCallback(async () => {
    await user?.delete();
    await SecureStore.deleteItemAsync(BACKGROUND_TOKEN_KEY);
    resetCloudState();
  }, [resetCloudState, user]);

  useEffect(() => {
    if (auth.isSignedIn) void getToken();
  }, [auth.isSignedIn, getToken]);

  const value = useMemo<AppAuthState>(() => ({
    configured: true,
    loaded: auth.isLoaded,
    signedIn: Boolean(auth.isSignedIn),
    userId: auth.userId ?? null,
    displayName: user?.fullName ?? user?.firstName ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    getToken,
    signOut,
    deleteIdentity,
  }), [auth.isLoaded, auth.isSignedIn, auth.userId, deleteIdentity, getToken, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  return useContext(AuthContext);
}
