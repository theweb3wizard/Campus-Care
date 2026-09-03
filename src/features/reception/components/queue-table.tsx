'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { updateQueueStatus, type QueueEntryWithStudent } from '@/features/reception/actions';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { useToast } from '@/components/feedback/toast';
import { formatQueueNumber, formatTime } from '@/lib/utils';
import { QUEUE_STATUS_COLORS, QUEUE_STATUS_LABELS } from '@/lib/constants';
import type { QueueStatus } from '@/types/database';
import { ClipboardList } from 'lucide-react';

interface Props {
  entries: QueueEntryWithStudent[];
  showActions?: boolean;
}

const NEXT_STATUS: Partial<Record<QueueStatus, { label: string; status: QueueStatus }>> = {
  waiting: { label: 'Call next', status: 'called' },
  called: { label: 'In consultation', status: 'in_consultation' },
  in_consultation: { label: 'Complete', status: 'completed' },
};

export function QueueTable({ entries, showActions = true }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [updating, setUpdating] = React.useState<string | null>(null);

  const handleStatusUpdate = async (entryId: string, newStatus: QueueStatus) => {
    setUpdating(entryId);
    const result = await updateQueueStatus(entryId, newStatus);
    setUpdating(null);

    if (!result.success) {
      toastError('Update failed', result.error ?? 'Could not update queue status.');
      return;
    }
    success('Queue updated', `Status changed to ${QUEUE_STATUS_LABELS[newStatus]}.`);
    router.refresh();
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8" />}
        title="Queue is empty"
        description="No patients in the queue yet. Check in a patient to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Patient
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
              File no.
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
              Check-in
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Status
            </th>
            {showActions && (
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map((entry) => {
            const next = NEXT_STATUS[entry.status as QueueStatus];
            const isUpdating = updating === entry.id;
            const isDone = entry.status === 'completed' || entry.status === 'cancelled' || entry.status === 'skipped';

            return (
              <tr
                key={entry.id}
                className={[
                  'transition-colors',
                  isDone ? 'opacity-50' : 'hover:bg-slate-50',
                ].join(' ')}
              >
                {/* Queue number */}
                <td className="px-4 py-3.5">
                  <span className="text-base font-bold text-slate-700 font-mono">
                    {formatQueueNumber(entry.queue_number)}
                  </span>
                </td>

                {/* Student info */}
                <td className="px-4 py-3.5">
                  <p className="font-medium text-slate-800">{entry.student.full_name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {entry.student.registration_number}
                  </p>
                </td>

                {/* File number */}
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <code className="text-xs text-slate-500 font-mono">
                    {entry.clinic_profile.file_number}
                  </code>
                </td>

                {/* Check-in time */}
                <td className="px-4 py-3.5 text-slate-400 text-xs hidden md:table-cell">
                  {formatTime(entry.visit.check_in_time)}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <StatusBadge
                    label={QUEUE_STATUS_LABELS[entry.status as QueueStatus]}
                    colorClass={QUEUE_STATUS_COLORS[entry.status as QueueStatus]}
                  />
                </td>

                {/* Action */}
                {showActions && (
                  <td className="px-4 py-3.5 text-right">
                    {next && !isDone ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isUpdating}
                        onClick={() => handleStatusUpdate(entry.id, next.status)}
                      >
                        {next.label}
                      </Button>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
