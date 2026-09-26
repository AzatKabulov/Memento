import type { SupabaseClient } from "@supabase/supabase-js";

// The web build remains a layout preview. Real accounts are tested in native builds.
export const authConfigured = false;
export const supabase: SupabaseClient | null = null;
