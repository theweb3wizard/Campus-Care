'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

/**
 * Client-side auth state hook.
 * Returns the current Supabase user and their application profile.
 * Listens to auth state changes.
 */
export function useAuth(): AuthState {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  React.useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data as Profile | null;
    };

    // Initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const profile = await fetchProfile(user.id);
        setState({ user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
