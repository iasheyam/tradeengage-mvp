import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for API routes only — never imported by client components.
// Bypasses Row Level Security; keep SUPABASE_SERVICE_ROLE_KEY server-side only.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
