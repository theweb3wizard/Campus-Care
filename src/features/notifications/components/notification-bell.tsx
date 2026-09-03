'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  profileId: string;
  href: string;
}

export function NotificationBell({ profileId, href }: Props) {
  const [unread, setUnread] = React.useState(0);

  // Initial load
  React.useEffect(() => {
    const supabase = createClient();

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('is_read', false);
      setUnread(count ?? 0);
    };

    fetchCount();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        () => fetchCount()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  return (
    <Link
      href={href}
      className="relative flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
    >
      <Bell className="h-4.5 w-4.5" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full"
          aria-hidden="true"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
