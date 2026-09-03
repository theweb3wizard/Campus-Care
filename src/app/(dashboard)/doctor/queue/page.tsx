import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { getDoctorQueue } from '@/features/doctor/actions';
import { DoctorQueueList } from '@/features/doctor/components/doctor-queue-list';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: "Today's Queue" };
export const revalidate = 0;

export default async function DoctorQueuePage() {
  await requireRole('doctor', 'admin');
  const entries = await getDoctorQueue();

  const activeCount = entries.filter(
    (e) => !['completed', 'cancelled', 'skipped'].includes(e.status)
  ).length;

  return (
    <div className="p-6 max-w-3xl">
      <QueueSubscriber channel="doctor-queue-page" />

      <div className="flex items-center gap-3 mb-7">
        <h1 className="text-heading-2">Today&apos;s Queue</h1>
        {activeCount > 0 && (
          <Badge variant="warning">{activeCount} active</Badge>
        )}
      </div>

      <DoctorQueueList entries={entries} />
    </div>
  );
}
