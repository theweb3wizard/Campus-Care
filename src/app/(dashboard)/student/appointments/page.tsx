import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '@/lib/constants';
import type { Appointment } from '@/types/database';
import type { AppointmentStatus } from '@/types/database';

export const metadata: Metadata = { title: 'My Appointments' };

const APPT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  checked_in: 'bg-violet-100 text-violet-700',
  completed:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-slate-100 text-slate-500',
  no_show:    'bg-red-100 text-red-600',
};

const APPT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled:  'Scheduled',
  checked_in: 'Checked In',
  completed:  'Completed',
  cancelled:  'Cancelled',
  no_show:    'No Show',
};

export default async function StudentAppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  const appointments = student
    ? await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', student.id)
        .order('scheduled_at', { ascending: false })
        .then(({ data }) => (data ?? []) as Appointment[])
    : [];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-heading-2">My Appointments</h1>
        <p className="text-body mt-1">Your scheduled clinic appointments.</p>
      </div>

      <Card padding="none">
        {appointments.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title="No appointments"
            description="You don't have any scheduled appointments. Walk-ins are always welcome."
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {appointments.map((appt) => (
              <div key={appt.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDateTime(appt.scheduled_at)}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-slate-500 mt-0.5">{appt.reason}</p>
                  )}
                </div>
                <StatusBadge
                  label={APPT_STATUS_LABELS[appt.status as AppointmentStatus]}
                  colorClass={APPT_STATUS_COLORS[appt.status as AppointmentStatus]}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
