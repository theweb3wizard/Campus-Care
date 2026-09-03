'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { startConsultation, completeConsultation, type DoctorQueueEntry } from '@/features/doctor/actions';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { useToast } from '@/components/feedback/toast';
import { formatQueueNumber, formatTime } from '@/lib/utils';
import { QUEUE_STATUS_COLORS, QUEUE_STATUS_LABELS } from '@/lib/constants';
import type { QueueStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface Props {
  entries: DoctorQueueEntry[];
}

export function DoctorQueueList({ entries }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleStart = async (entry: DoctorQueueEntry) => {
    setLoadingId(entry.id);
    const res = await startConsultation(entry.id, entry.visit.id);
    setLoadingId(null);
    if (!res.success) {
      toastError('Failed to start', res.error ?? 'Please try again.');
      return;
    }
    success('Consultation started', `${entry.student.full_name} is now in consultation.`);
    router.push(`/doctor/consultation?visit=${entry.visit.id}`);
  };

  const handleComplete = async (entry: DoctorQueueEntry) => {
    setLoadingId(entry.id);
    const res = await completeConsultation(entry.id, entry.visit.id, false);
    setLoadingId(null);
    if (!res.success) {
      toastError('Failed to complete', res.error ?? 'Please try again.');
      return;
    }
    success('Consultation completed', `${entry.student.full_name}'s visit is complete.`);
    router.refresh();
  };

  const active = entries.filter((e) => !['completed', 'cancelled', 'skipped'].includes(e.status));
  const done = entries.filter((e) => ['completed', 'cancelled', 'skipped'].includes(e.status));

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-8 w-8" />}
        title="No patients in queue"
        description="Patients will appear here once the receptionist checks them in."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Active patients */}
      {active.map((entry) => {
        const isLoading = loadingId === entry.id;
        const isInConsultation = entry.status === 'in_consultation';
        const isWaiting = entry.status === 'waiting' || entry.status === 'called';

        return (
          <div
            key={entry.id}
            className={cn(
              'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all',
              isInConsultation
                ? 'border-violet-200 bg-violet-50/40'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            )}
          >
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
              {/* Queue number */}
              <div className={cn(
                'h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg font-mono shrink-0',
                isInConsultation ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'
              )}>
                {formatQueueNumber(entry.queue_number)}
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">
                    {entry.student.full_name}
                  </p>
                  <StatusBadge
                    label={QUEUE_STATUS_LABELS[entry.status as QueueStatus]}
                    colorClass={QUEUE_STATUS_COLORS[entry.status as QueueStatus]}
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                  <span className="font-mono">{entry.student.registration_number}</span>
                  <span>·</span>
                  <span>{entry.clinic_profile.file_number}</span>
                  <span>·</span>
                  <span>In at {formatTime(entry.visit.check_in_time)}</span>
                </div>
                {entry.clinic_profile.allergies && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    ⚠ Allergies: {entry.clinic_profile.allergies}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isWaiting && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isLoading}
                  leftIcon={<Stethoscope className="h-4 w-4" />}
                  onClick={() => handleStart(entry)}
                >
                  Start
                </Button>
              )}
              {isInConsultation && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/doctor/consultation?visit=${entry.visit.id}`)}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Open
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    loading={isLoading}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => handleComplete(entry)}
                  >
                    Complete
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Completed section */}
      {done.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Completed today ({done.length})
          </p>
          <div className="space-y-2">
            {done.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 opacity-60"
              >
                <span className="text-sm font-bold font-mono text-slate-400 w-12 text-center">
                  {formatQueueNumber(entry.queue_number)}
                </span>
                <p className="text-sm text-slate-500 flex-1 truncate">
                  {entry.student.full_name}
                </p>
                <StatusBadge
                  label={QUEUE_STATUS_LABELS[entry.status as QueueStatus]}
                  colorClass={QUEUE_STATUS_COLORS[entry.status as QueueStatus]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
