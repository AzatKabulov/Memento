import type { SupabaseClient } from "@supabase/supabase-js";

// TypeScript's fallback for platform-specific client.native/client.web modules.
export const authConfigured = false;
export const supabase: SupabaseClient | null = null;
