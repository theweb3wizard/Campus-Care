import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { getDoctorQueue } from '@/features/doctor/actions';
import { StatCard } from '@/components/ui/card';
import { DoctorQueueList } from '@/features/doctor/components/doctor-queue-list';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { Stethoscope, Clock, CheckCircle2, Users } from 'lucide-react';

export const metadata: Metadata = { title: 'Doctor Workspace' };
export const revalidate = 0; // Always fresh — realtime handles updates

export default async function DoctorDashboardPage() {
  const profile = await requireRole('doctor', 'admin');
  const entries = await getDoctorQueue();

  const waiting = entries.filter((e) => e.status === 'waiting' || e.status === 'called').length;
  const inConsultation = entries.filter((e) => e.status === 'in_consultation').length;
  const completed = entries.filter((e) => e.status === 'completed').length;
  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="p-4 sm:p-6">
      {/* Realtime subscription — invisible, keeps queue live */}
      <QueueSubscriber channel="doctor-queue" />

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-heading-2">Good morning, Dr. {firstName}</h1>
        <p className="text-body mt-1">
          {new Date().toLocaleDateString('en-NG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Waiting"
          value={waiting}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="In consultation"
          value={inConsultation}
          icon={<Stethoscope className="h-5 w-5" />}
        />
        <StatCard
          label="Completed today"
          value={completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Total today"
          value={entries.length}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Queue */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Today&apos;s queue
        </h2>
        <DoctorQueueList entries={entries} />
      </div>
    </div>
  );
}
