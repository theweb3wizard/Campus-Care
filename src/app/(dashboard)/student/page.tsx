import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  CLINIC_REGISTRATION_STATUS_LABELS,
  CLINIC_REGISTRATION_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
  QUEUE_STATUS_LABELS,
  QUEUE_STATUS_COLORS,
  PRESCRIPTION_STATUS_LABELS,
  PRESCRIPTION_STATUS_COLORS,
} from '@/lib/constants';
import { formatDate, formatTime, formatQueueNumber } from '@/lib/utils';
import {
  ClipboardList,
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import type {
  Student,
  ClinicProfile,
  Visit,
  QueueEntry,
  ClinicRegistrationStatus,
  VisitStatus,
  QueueStatus,
  PrescriptionStatus,
} from '@/types/database';

export const metadata: Metadata = { title: 'My Health' };

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── Fetch all student data in parallel ──────────────────────────────────────
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  const s = student as Student | null;
  const today = new Date().toISOString().split('T')[0];

  const [clinicProfileRes, activeVisitRes] = await Promise.all([
    s
      ? supabase
          .from('clinic_profiles')
          .select('*')
          .eq('student_id', s.id)
          .single()
      : Promise.resolve({ data: null }),
    s
      ? supabase
          .from('visits')
          .select('*')
          .eq('student_id', s.id)
          .eq('visit_date', today)
          .not('status', 'in', '("completed","cancelled","no_show")')
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const cp = clinicProfileRes.data as ClinicProfile | null;
  const activeVisit = activeVisitRes.data as Visit | null;

  // Queue entry for active visit
  const { data: queueEntryData } = activeVisit
    ? await supabase
        .from('queue_entries')
        .select('*')
        .eq('visit_id', activeVisit.id)
        .maybeSingle()
    : { data: null };
  const queueEntry = queueEntryData as QueueEntry | null;

  // Recent prescriptions (last 5)
  const { data: prescriptionsData } = cp
    ? await supabase
        .from('prescriptions')
        .select(`
          id, status, created_at,
          prescription_items (
            id, dosage, frequency, status,
            medications ( name, unit )
          )
        `)
        .eq('clinic_profile_id', cp.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };
  const prescriptions = (prescriptionsData ?? []) as any[];

  // Upcoming appointment
  const { data: upcomingAppt } = s
    ? await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', s.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1)
        .maybeSingle()
    : { data: null };

  const firstName = s?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-heading-2">Hello, {firstName} 👋</h1>
        <p className="text-body mt-1">
          {new Date().toLocaleDateString('en-NG', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* ── Active visit card ── */}
      {activeVisit && (
        <Card className="border-blue-200 bg-blue-50/40">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">
                Active visit today
              </h2>
            </div>
            <StatusBadge
              label={VISIT_STATUS_LABELS[activeVisit.status as VisitStatus]}
              colorClass={VISIT_STATUS_COLORS[activeVisit.status as VisitStatus]}
            />
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Checked in at {formatTime(activeVisit.check_in_time)}
          </p>

          {/* Queue status */}
          {queueEntry && (
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Your queue number</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {formatQueueNumber(queueEntry.queue_number)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5">Status</p>
                <StatusBadge
                  label={QUEUE_STATUS_LABELS[queueEntry.status as QueueStatus]}
                  colorClass={QUEUE_STATUS_COLORS[queueEntry.status as QueueStatus]}
                />
              </div>
            </div>
          )}

          {activeVisit.status === 'awaiting_pharmacy' && (
            <div className="flex items-center gap-2 mt-3 p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg">
              <Pill className="h-4 w-4 text-cyan-600 shrink-0" />
              <p className="text-xs font-medium text-cyan-700">
                Your prescription is ready at the pharmacy.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── Clinic registration card ── */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">
              Clinic Registration
            </h2>
          </div>
          {cp && (
            <StatusBadge
              label={CLINIC_REGISTRATION_STATUS_LABELS[cp.registration_status as ClinicRegistrationStatus]}
              colorClass={CLINIC_REGISTRATION_STATUS_COLORS[cp.registration_status as ClinicRegistrationStatus]}
            />
          )}
        </div>

        {cp ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">File number</p>
              <p className="font-semibold text-slate-800 font-mono">
                {cp.file_number}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Registration</p>
              <p className="font-medium text-slate-700">
                {s?.registration_number}
              </p>
            </div>
            {cp.blood_group && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Blood group</p>
                <p className="font-medium text-slate-700">{cp.blood_group}</p>
              </div>
            )}
            {cp.genotype && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Genotype</p>
                <p className="font-medium text-slate-700">{cp.genotype}</p>
              </div>
            )}
            {cp.allergies && (
              <div className="col-span-2">
                <p className="text-slate-400 text-xs mb-0.5">Known allergies</p>
                <p className="text-sm text-rose-600 font-medium">
                  {cp.allergies}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Not yet registered
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Visit the clinic reception to complete your registration.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Upcoming appointment ── */}
      {upcomingAppt && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">
              Upcoming appointment
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-700">
            {formatDate(upcomingAppt.scheduled_at, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {upcomingAppt.reason && (
            <p className="text-xs text-slate-500 mt-1">{upcomingAppt.reason}</p>
          )}
        </Card>
      )}

      {/* ── Recent prescriptions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent prescriptions
          </h2>
          <Link
            href="/student/prescriptions"
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {prescriptions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Pill className="h-6 w-6" />}
              title="No prescriptions yet"
              description="Prescriptions from your clinic visits will appear here."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx: any) => (
              <Card key={rx.id} padding="sm">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-slate-400">
                    {formatDate(rx.created_at)}
                  </p>
                  <StatusBadge
                    label={PRESCRIPTION_STATUS_LABELS[rx.status as PrescriptionStatus]}
                    colorClass={PRESCRIPTION_STATUS_COLORS[rx.status as PrescriptionStatus]}
                  />
                </div>
                {rx.prescription_items?.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {item.medications?.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.dosage} · {item.frequency}
                      </p>
                    </div>
                    <StatusBadge
                      label={item.status === 'dispensed' ? 'Dispensed' : item.status === 'pending' ? 'Pending' : item.status}
                      colorClass={
                        item.status === 'dispensed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'unavailable'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-700'
                      }
                      dot={false}
                    />
                  </div>
                ))}
                {rx.prescription_items?.length > 3 && (
                  <p className="text-xs text-slate-400 mt-1">
                    +{rx.prescription_items.length - 3} more item
                    {rx.prescription_items.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Student identity ── */}
      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Student</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {s?.full_name}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {s?.registration_number} · {s?.department}
            </p>
          </div>
          <Link
            href="/student/profile"
            className="text-xs text-blue-600 hover:underline shrink-0"
          >
            View profile
          </Link>
        </div>
      </Card>
    </div>
  );
}
