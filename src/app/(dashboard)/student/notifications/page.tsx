import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Bell } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { Notification } from '@/types/database';

export const metadata: Metadata = { title: 'Notifications' };

const TYPE_ICONS: Record<string, string> = {
  onboarding:              '👋',
  appointment:             '📅',
  queue_update:            '🔢',
  prescription_ready:      '💊',
  prescription_dispensed:  '✅',
  follow_up:               '📋',
  system:                  '🔔',
};

export default async function StudentNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark all as read (fire and forget)
  if (unreadCount > 0) {
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', user.id)
      .eq('is_read', false)
      .then(() => {});
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-heading-2">Notifications</h1>
        <p className="text-body mt-1">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
            : 'All caught up.'}
        </p>
      </div>

      <Card padding="none">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="No notifications"
            description="You'll be notified here about appointments, queue updates, and prescriptions."
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={[
                  'px-6 py-4 flex items-start gap-3',
                  !n.is_read ? 'bg-blue-50/50' : '',
                ].join(' ')}
              >
                <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
                  {TYPE_ICONS[n.type] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={[
                      'text-sm',
                      !n.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700',
                    ].join(' ')}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" aria-label="Unread" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
