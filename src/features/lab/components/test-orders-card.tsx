'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import {
  orderTest,
  markTestSampled,
  saveTestResult,
  type TestOrder,
} from '@/features/lab/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';

const STATUS_COLORS: Record<TestOrder['status'], string> = {
  ordered: 'bg-amber-100 text-amber-700',
  sampled: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export function TestOrdersCard({
  visitId,
  clinicProfileId,
  initial,
}: {
  visitId: string;
  clinicProfileId: string;
  initial: TestOrder[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [orders, setOrders] = React.useState(initial);
  const [testType, setTestType] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [results, setResults] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleOrder = async () => {
    setFormError(null);
    if (testType.trim().length < 2) {
      setFormError('Name the test first (e.g. Malaria, Blood count).');
      return;
    }
    setLoading('new');
    const res = await orderTest(visitId, clinicProfileId, testType, notes);
    setLoading(null);
    if (!res.success) {
      setFormError(res.error ?? 'Could not order test.');
      return;
    }
    setTestType('');
    setNotes('');
    success('Test ordered', 'The lab request was added.');
    refresh();
  };

  const handleSampled = async (id: string) => {
    setLoading(id);
    const res = await markTestSampled(id);
    setLoading(null);
    if (!res.success) {
      toastError('Failed', res.error ?? 'Please try again.');
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'sampled' } : o)));
    refresh();
  };

  const handleResult = async (id: string) => {
    const text = (results[id] ?? '').trim();
    if (text.length < 2) {
      toastError('Empty result', 'Write the result first.');
      return;
    }
    setLoading(id);
    const res = await saveTestResult(id, text);
    setLoading(null);
    if (!res.success) {
      toastError('Failed', res.error ?? 'Please try again.');
      return;
    }
    success('Result ready', 'Student has been notified.');
    refresh();
  };

  return (
    <div className="space-y-4">
      {formError && <InlineError message={formError} />}

      {/* New order */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            label="New test order"
            placeholder="e.g. Malaria, Blood count, Urinalysis"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="flex-1">
          <Input
            label="Note (optional)"
            placeholder="e.g. Fasting sample"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="sm" loading={loading === 'new'} leftIcon={<FlaskConical className="h-4 w-4" />} onClick={handleOrder}>
            Order
          </Button>
        </div>
      </div>

      {/* List */}
      {orders.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-7 w-7" />}
          title="No tests ordered"
          description="Order a test above when the patient needs one."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{o.test_type}</p>
                  {o.notes && <p className="text-xs text-slate-500 mt-0.5">{o.notes}</p>}
                </div>
                <StatusBadge label={o.status} colorClass={STATUS_COLORS[o.status]} />
              </div>

              {o.status === 'ordered' && (
                <Button variant="outline" size="sm" loading={loading === o.id} onClick={() => handleSampled(o.id)}>
                  Mark sample taken
                </Button>
              )}

              {o.status === 'sampled' && (
                <div className="space-y-2 mt-2">
                  <label className="text-xs font-medium text-slate-500">Result</label>
                  <textarea
                    rows={3}
                    placeholder="Type the result here…"
                    value={results[o.id] ?? ''}
                    onChange={(e) => setResults((prev) => ({ ...prev, [o.id]: e.target.value }))}
                    className="input-base w-full text-sm"
                    maxLength={2000}
                  />
                  <Button variant="primary" size="sm" loading={loading === o.id} onClick={() => handleResult(o.id)}>
                    Save result + notify student
                  </Button>
                </div>
              )}

              {o.status === 'ready' && o.result_text && (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 mt-1 whitespace-pre-wrap">
                  {o.result_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
