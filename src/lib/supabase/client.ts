import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Use in Client Components only.
 * Do NOT use this in Server Components or Route Handlers.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
