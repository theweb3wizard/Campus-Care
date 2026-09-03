import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { getTodaysQueue } from '@/features/reception/actions';
import { Card, StatCard } from '@/components/ui/card';
import { QueueTable } from '@/features/reception/components/queue-table';
import { PatientSearch } from '@/features/reception/components/patient-search';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { Users, ClipboardList, UserCheck, Clock, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Reception' };
export const revalidate = 0;

export default async function ReceptionDashboardPage() {
  const profile = await requireRole('receptionist', 'admin');
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [visitsRes, entries] = await Promise.all([
    supabase
      .from('visits')
      .select('id, status')
      .eq('visit_date', today),
    getTodaysQueue(),
  ]);

  const visits = visitsRes.data ?? [];
  const waitingCount = entries.filter(
    (e) => e.status === 'waiting' || e.status === 'called'
  ).length;
  const completedToday = visits.filter((v) => v.status === 'completed').length;
  const inConsultation = entries.filter(
    (e) => e.status === 'in_consultation'
  ).length;

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="p-6">
      <QueueSubscriber channel="reception-dashboard" />
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-heading-2">Good morning, {firstName}</h1>
          <p className="text-body mt-1">
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link href="/reception/check-in">
          <Button
            variant="primary"
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Walk-in check-in
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Check-ins today"
          value={visits.length}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Waiting"
          value={waitingCount}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="In consultation"
          value={inConsultation}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={completedToday}
          icon={<ClipboardList className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick search */}
        <div className="xl:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick patient search</h2>
          <PatientSearch />
        </div>

        {/* Live queue */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Today&apos;s queue
              {entries.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({entries.length} {entries.length === 1 ? 'patient' : 'patients'})
                </span>
              )}
            </h2>
            <Link
              href="/reception/queue"
              className="text-xs text-blue-600 hover:underline"
            >
              Full view →
            </Link>
          </div>
          <Card padding="none">
            <QueueTable
              entries={entries.slice(0, 8)}
              showActions={true}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
