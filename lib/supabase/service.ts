import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so it must ONLY run on the server and ONLY
 * after the caller has passed the superadmin check. This file has no
 * "server-only" import so middleware (edge) can use it; app code should import
 * from ./admin which adds that guard.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
