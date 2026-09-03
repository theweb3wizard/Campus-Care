'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Client-side hook to read the current user's application profile.
 * For server components, use getCurrentProfile() from auth/actions instead.
 */
export function useProfile(): ProfileState {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setProfile(null); setLoading(false); }
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (fetchError) setError(fetchError.message);
        setProfile(data as Profile | null);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  return { profile, loading, error, refresh };
}
