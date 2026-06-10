import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

const fallbackSupabaseUrl = "https://knmaekgzppmaclkesxfs.supabase.co";
const fallbackPublishableKey = "sb_publishable_5eVI68q2k497cOMZajdaEw_oWthjl-I";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
});
