'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { upsertClinicProfile } from '@/features/reception/actions';
import { clinicRegistrationSchema, type ClinicRegistrationInput } from '@/lib/validations/reception';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';
import type { ClinicProfile } from '@/types/database';

interface Props {
  studentId: string;
  studentName: string;
  existing?: ClinicProfile | null;
  onSuccess?: (profile: ClinicProfile) => void;
  onCancel?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

export function ClinicRegistrationForm({
  studentId,
  studentName,
  existing,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClinicRegistrationInput>({
    resolver: zodResolver(clinicRegistrationSchema),
    defaultValues: {
      blood_group: existing?.blood_group ?? '',
      genotype: existing?.genotype ?? '',
      allergies: existing?.allergies ?? '',
      registration_status: existing?.registration_status ?? 'in_progress',
    },
  });

  const onSubmit = async (data: ClinicRegistrationInput) => {
    setServerError(null);
    const result = await upsertClinicProfile(studentId, {
      blood_group: data.blood_group,
      genotype: data.genotype,
      allergies: data.allergies,
      registration_status: data.registration_status,
    });

    if (!result.success || !result.clinic_profile) {
      setServerError(result.error ?? 'Failed to save registration. Please try again.');
      return;
    }

    success(
      'Registration saved',
      `Clinic profile updated for ${studentName}.`
    );
    router.refresh();
    onSuccess?.(result.clinic_profile);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {existing?.file_number && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">File number</span>
          <code className="text-sm font-semibold text-slate-800 font-mono ml-1">
            {existing.file_number}
          </code>
        </div>
      )}

      {serverError && <InlineError message={serverError} />}

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Blood group"
          placeholder="Select…"
          options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
          error={errors.blood_group?.message}
          {...register('blood_group')}
        />
        <Select
          label="Genotype"
          placeholder="Select…"
          options={GENOTYPES.map((g) => ({ value: g, label: g }))}
          error={errors.genotype?.message}
          {...register('genotype')}
        />
      </div>

      <Textarea
        label="Known allergies"
        placeholder="e.g. Penicillin, Sulfonamides. Leave blank if none known."
        rows={2}
        error={errors.allergies?.message}
        {...register('allergies')}
      />

      <Select
        label="Registration status"
        required
        options={[
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'awaiting_results', label: 'Awaiting Results' },
          { value: 'completed', label: 'Completed' },
        ]}
        error={errors.registration_status?.message}
        {...register('registration_status')}
      />

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {existing ? 'Update registration' : 'Create clinic profile'}
        </Button>
      </div>
    </form>
  );
}
