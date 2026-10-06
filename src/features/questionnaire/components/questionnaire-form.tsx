'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { submitQuestionnaire } from '@/features/questionnaire/actions';
import { QUESTIONS } from '@/features/questionnaire/questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';

export function QuestionnaireForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    setLoading(true);
    const res = await submitQuestionnaire(answers);
    setLoading(false);
    if (!res.success) {
      setFormError(res.error ?? 'Could not save.');
      toastError('Failed', res.error ?? 'Please try again.');
      return;
    }
    setDone(true);
    success('Saved', 'Doctor will read this before seeing you.');
    router.refresh();
  };

  if (done) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-lg font-semibold text-slate-900">Answers saved</p>
        <p className="text-sm text-slate-500">You can submit again any time before your visit.</p>
        <Button variant="outline" onClick={() => setDone(false)}>
          Answer again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 -mt-1">
        7 short questions. Answer what applies, skip the rest.
      </p>
      {formError && <InlineError message={formError} />}
      {QUESTIONS.map((q, i) => (
        <Input
          key={q.key}
          label={`${i + 1}. ${q.label}`}
          placeholder="Type here (or leave empty)"
          value={answers[q.key] ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
          maxLength={300}
        />
      ))}
      <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleSubmit}>
        Save answers
      </Button>
    </div>
  );
}
