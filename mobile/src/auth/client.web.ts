import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const authConfigured = !!url && !!publishableKey;

// Supabase JS persists browser sessions in localStorage and refreshes them while
// the PWA is open. Only the publishable key belongs in this client bundle.
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          // The auth callback route exchanges email verification/reset codes.
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;
