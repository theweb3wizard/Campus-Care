import type { Metadata } from 'next';
import { getStudentTests } from '@/features/lab/actions';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { FlaskConical } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Test Results' };

const COLORS: Record<string, string> = {
  ordered: 'bg-amber-100 text-amber-700',
  sampled: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function StudentTestsPage() {
  const tests = await getStudentTests();

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-heading-2">Test Results</h1>
        <p className="text-body mt-1">Results appear here once the doctor finishes them.</p>
      </div>

      {tests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FlaskConical className="h-7 w-7" />}
            title="No tests yet"
            description="Tests your doctor orders will show here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.test_type}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(t.created_at)}</p>
                </div>
                <StatusBadge label={t.status} colorClass={COLORS[t.status]} />
              </div>
              {t.status === 'ready' && t.result_text ? (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap">
                  {t.result_text}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Still being processed. You will be notified when ready.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
