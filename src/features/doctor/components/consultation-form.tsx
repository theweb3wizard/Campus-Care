'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Save, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { saveMedicalRecord, completeConsultation } from '@/features/doctor/actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';
import { cn } from '@/lib/utils';

const consultationSchema = z.object({
  complaint: z.string().min(1, 'Please record the presenting complaint'),
  clinical_notes: z.string(),
  diagnosis: z.string(),
  assessment: z.string(),
  treatment_plan: z.string(),
  follow_up_instructions: z.string(),
  follow_up_date: z.string(),
  bp_systolic: z.string(),
  bp_diastolic: z.string(),
  temperature: z.string(),
  pulse: z.string(),
  weight: z.string(),
  spo2: z.string(),
});

type ConsultationInput = z.infer<typeof consultationSchema>;

interface Props {
  visitId: string;
  queueEntryId: string;
  existing?: {
    complaint: string | null;
    clinical_notes: string | null;
    diagnosis: string | null;
    assessment: string | null;
    treatment_plan: string | null;
    follow_up_instructions: string | null;
    follow_up_date: string | null;
    vital_signs: Record<string, string> | null;
  } | null;
  onPrescribe?: () => void;
}

export function ConsultationForm({ visitId, queueEntryId, existing, onPrescribe }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [vitalsOpen, setVitalsOpen] = React.useState(false);

  const vs = existing?.vital_signs ?? {};

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ConsultationInput>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      complaint: existing?.complaint ?? '',
      clinical_notes: existing?.clinical_notes ?? '',
      diagnosis: existing?.diagnosis ?? '',
      assessment: existing?.assessment ?? '',
      treatment_plan: existing?.treatment_plan ?? '',
      follow_up_instructions: existing?.follow_up_instructions ?? '',
      follow_up_date: existing?.follow_up_date ?? '',
      bp_systolic: vs.bp_systolic ?? '',
      bp_diastolic: vs.bp_diastolic ?? '',
      temperature: vs.temperature ?? '',
      pulse: vs.pulse ?? '',
      weight: vs.weight ?? '',
      spo2: vs.spo2 ?? '',
    },
  });

  const buildVitalSigns = (data: ConsultationInput) => {
    const signs: Record<string, string> = {};
    if (data.bp_systolic && data.bp_diastolic)
      signs.bp = `${data.bp_systolic}/${data.bp_diastolic} mmHg`;
    if (data.temperature) signs.temperature = `${data.temperature}°C`;
    if (data.pulse) signs.pulse = `${data.pulse} bpm`;
    if (data.weight) signs.weight = `${data.weight} kg`;
    if (data.spo2) signs.spo2 = `${data.spo2}%`;
    return signs;
  };

  const handleSave = async (data: ConsultationInput) => {
    setServerError(null);
    const res = await saveMedicalRecord(visitId, {
      complaint: data.complaint,
      clinical_notes: data.clinical_notes,
      diagnosis: data.diagnosis,
      assessment: data.assessment,
      treatment_plan: data.treatment_plan,
      follow_up_instructions: data.follow_up_instructions,
      follow_up_date: data.follow_up_date,
      vital_signs: buildVitalSigns(data),
    });

    if (!res.success) {
      setServerError(res.error ?? 'Failed to save. Please try again.');
      return;
    }
    success('Notes saved', 'Consultation notes have been recorded.');
    router.refresh();
  };

  const handleComplete = async (data: ConsultationInput) => {
    setServerError(null);
    // Save first
    const saveRes = await saveMedicalRecord(visitId, {
      complaint: data.complaint,
      clinical_notes: data.clinical_notes,
      diagnosis: data.diagnosis,
      assessment: data.assessment,
      treatment_plan: data.treatment_plan,
      follow_up_instructions: data.follow_up_instructions,
      follow_up_date: data.follow_up_date,
      vital_signs: buildVitalSigns(data),
    });

    if (!saveRes.success) {
      setServerError(saveRes.error ?? 'Failed to save notes.');
      return;
    }

    const completeRes = await completeConsultation(queueEntryId, visitId, false);
    if (!completeRes.success) {
      setServerError(completeRes.error ?? 'Failed to complete consultation.');
      return;
    }

    success('Visit completed', 'The consultation has been closed.');
    router.push('/doctor/queue');
  };

  return (
    <form className="space-y-5" noValidate>
      {serverError && <InlineError message={serverError} />}

      {/* Presenting complaint */}
      <Textarea
        label="Presenting complaint"
        required
        placeholder="Patient's reason for visit and presenting symptoms…"
        rows={3}
        error={errors.complaint?.message}
        {...register('complaint')}
      />

      {/* Clinical notes */}
      <Textarea
        label="Clinical notes"
        placeholder="History, examination findings…"
        rows={4}
        {...register('clinical_notes')}
      />

      {/* Diagnosis / Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Textarea
          label="Diagnosis"
          placeholder="Working or confirmed diagnosis…"
          rows={3}
          {...register('diagnosis')}
        />
        <Textarea
          label="Assessment"
          placeholder="Clinical assessment…"
          rows={3}
          {...register('assessment')}
        />
      </div>

      {/* Treatment plan */}
      <Textarea
        label="Treatment plan"
        placeholder="Prescribed management, advice, referrals…"
        rows={3}
        {...register('treatment_plan')}
      />

      {/* Follow-up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Textarea
          label="Follow-up instructions"
          placeholder="Instructions for the patient…"
          rows={2}
          {...register('follow_up_instructions')}
        />
        <Input
          label="Follow-up date"
          type="date"
          hint="Leave blank if no follow-up required."
          {...register('follow_up_date')}
        />
      </div>

      {/* Vital signs (collapsible) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setVitalsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-sm font-medium text-slate-700">Vital signs</span>
          {vitalsOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {vitalsOpen && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Blood pressure
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="120"
                  className="input-base w-full"
                  {...register('bp_systolic')}
                />
                <span className="text-slate-400 shrink-0">/</span>
                <input
                  type="number"
                  placeholder="80"
                  className="input-base w-full"
                  {...register('bp_diastolic')}
                />
                <span className="text-xs text-slate-400 shrink-0">mmHg</span>
              </div>
            </div>
            <Input
              label="Temperature"
              type="number"
              placeholder="37.0"
              hint="°C"
              {...register('temperature')}
            />
            <Input
              label="Pulse"
              type="number"
              placeholder="72"
              hint="bpm"
              {...register('pulse')}
            />
            <Input
              label="Weight"
              type="number"
              placeholder="70"
              hint="kg"
              {...register('weight')}
            />
            <Input
              label="SpO₂"
              type="number"
              placeholder="98"
              hint="%"
              {...register('spo2')}
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            loading={isSubmitting}
            onClick={handleSubmit(handleSave)}
          >
            Save notes
          </Button>
          {onPrescribe && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onPrescribe}
            >
              Add prescription
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="success"
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
          loading={isSubmitting}
          onClick={handleSubmit(handleComplete)}
        >
          Complete visit
        </Button>
      </div>
    </form>
  );
}
