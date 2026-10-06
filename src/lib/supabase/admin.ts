import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Service-role client. SERVER ONLY — never import in client components.
 * Needed once: creating staff auth users (free, part of Supabase).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Dashboard > API > service_role).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (Supabase Dashboard > Project Settings > API > service_role key).'
    );
  }

  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
