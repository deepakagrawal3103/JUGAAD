import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV, isSupabaseConfigured } from "../config/env.js";

let _serviceClient: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase backend environment variables are not configured.");
  }
  if (!_serviceClient) {
    _serviceClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serviceClient;
}

export function getAnonSupabase(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error("Supabase URL and ANON key are required.");
  }
  if (!_anonClient) {
    _anonClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anonClient;
}
