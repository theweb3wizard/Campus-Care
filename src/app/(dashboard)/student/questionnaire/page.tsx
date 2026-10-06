import type { Metadata } from 'next';
import { QuestionnaireForm } from '@/features/questionnaire/components/questionnaire-form';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Health Questions' };

export default function StudentQuestionnairePage() {
  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-heading-2">Health Questions</h1>
        <p className="text-body mt-1">Help the doctor see you faster.</p>
      </div>

      <Card>
        <QuestionnaireForm />
      </Card>
    </div>
  );
}
