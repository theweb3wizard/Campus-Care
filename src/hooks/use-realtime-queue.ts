'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribes to Supabase Realtime changes on queue_entries for today.
 * On any INSERT or UPDATE, triggers a Next.js router.refresh() so all
 * Server Components on the current page re-fetch with fresh data.
 *
 * Usage: call this hook once in the top-level client component of any
 * page that needs live queue updates (doctor queue, reception queue).
 */
export function useRealtimeQueue(channelName = 'queue-updates') {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'queue_entries',
        },
        () => {
          // Re-run all Server Components on the current page
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, channelName]);
}
