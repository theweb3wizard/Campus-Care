'use client';

import { useRealtimeQueue } from '@/hooks/use-realtime-queue';

/**
 * Drop this invisible component into any Server Component page that
 * needs live queue updates. It holds the Realtime subscription and
 * calls router.refresh() when queue_entries or visits change.
 */
export function QueueSubscriber({ channel }: { channel?: string }) {
  useRealtimeQueue(channel ?? 'queue-live');
  return null;
}
