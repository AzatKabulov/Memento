import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Linking from "expo-linking";
import { AppState, Platform } from "react-native";
import { authConfigured, supabase } from "./client";
import {
  activatePhotoThumbnails,
  clearPhotoThumbnails,
} from "../lib/photoThumbnails";

type AuthState = {
  configured: boolean;
  loading: boolean;
  ownerId: string | null;
  email: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function requireClient() {
  if (!supabase) throw new Error("Account service is not configured yet.");
  return supabase;
}

function authRedirect(path: string) {
  if (Platform.OS === "web" && typeof window !== "undefined")
    return new URL(path, window.location.origin).toString();
  return Linking.createURL(path.replace(/^\/+/, ""));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(authConfigured);
  useEffect(() => {
    activatePhotoThumbnails(ownerId);
  }, [ownerId]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setOwnerId(data.session?.user.id ?? null);
          setEmail(data.session?.user.email ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setOwnerId(session?.user.id ?? null);
        setEmail(session?.user.email ?? null);
      }
    });
    if (Platform.OS !== "web") {
      if (AppState.currentState === "active") client.auth.startAutoRefresh();
    }
    const appStateSubscription =
      Platform.OS === "web"
        ? null
        : AppState.addEventListener("change", (state) => {
            if (state === "active") client.auth.startAutoRefresh();
            else client.auth.stopAutoRefresh();
          });
    return () => {
      active = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: authConfigured,
      loading,
      ownerId,
      email,
      signInEmail: async (email, password) => {
        const { error } = await requireClient().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signUpEmail: async (email, password) => {
        const { data, error } = await requireClient().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirect("/auth/callback") },
        });
        if (error) throw error;
        return !data.session;
      },
      sendPasswordReset: async (email) => {
        const { error } = await requireClient().auth.resetPasswordForEmail(
          email,
          {
            redirectTo: authRedirect("/auth/reset"),
          },
        );
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await requireClient().auth.signOut();
        if (error) throw error;
        if (ownerId) await clearPhotoThumbnails(ownerId);
        setOwnerId(null);
        setEmail(null);
      },
    }),
    [loading, ownerId, email],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider is missing");
  return state;
}
