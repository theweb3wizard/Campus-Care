'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createStaffSchema, type CreateStaffInput } from '@/lib/validations/staff';
import { STAFF_ROLES, USER_ROLES } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';
import type { UserRole } from '@/types/roles';

export function CreateStaffButton() {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
  });

  const roleOptions = STAFF_ROLES.map((r) => ({
    value: r,
    label: USER_ROLES[r as UserRole],
  }));

  const onSubmit = async (data: CreateStaffInput) => {
    setServerError(null);
    const supabase = createClient();

    // Use Supabase admin invite — creates auth user + sends invite email
    // In production this requires service role. For MVP we use signUp with
    // a temporary password and rely on the email confirmation flow.
    const tempPassword = `CampusCare@${Math.random().toString(36).slice(2, 10)}!`;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: tempPassword,
      options: {
        data: {
          full_name: data.full_name.trim(),
          role: data.role,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setServerError('A user with this email already exists.');
      } else {
        setServerError(signUpError.message);
      }
      return;
    }

    if (!authData.user) {
      setServerError('Account creation failed. Please try again.');
      return;
    }

    // Create staff_profile record
    if (data.department || data.specialization || data.employee_id) {
      await supabase.from('staff_profiles').insert({
        profile_id: authData.user.id,
        employee_id: data.employee_id || null,
        department: data.department || null,
        specialization: data.specialization || null,
        is_active: true,
      });
    }

    success(
      'Staff member created',
      `${data.full_name} has been added as ${USER_ROLES[data.role as UserRole]}.`
    );
    reset();
    setOpen(false);
    router.refresh();
  };

  const handleClose = () => {
    setOpen(false);
    reset();
    setServerError(null);
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        leftIcon={<UserPlus className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        Add staff member
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Add staff member"
        description="Create a new staff account. They will receive an email to confirm their account."
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <InlineError message={serverError} />}

          <Input
            label="Full name"
            placeholder="Dr. Chidi Okeke"
            required
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <Input
            label="Email address"
            type="email"
            placeholder="staff@university.edu.ng"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Select
            label="Role"
            placeholder="Select a role…"
            required
            options={roleOptions}
            error={errors.role?.message}
            {...register('role')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder="e.g. Internal Medicine"
              error={errors.department?.message}
              {...register('department')}
            />
            <Input
              label="Employee ID"
              placeholder="e.g. EMP-0042"
              error={errors.employee_id?.message}
              {...register('employee_id')}
            />
          </div>

          <Input
            label="Specialization"
            placeholder="e.g. General Practice (for doctors)"
            error={errors.specialization?.message}
            {...register('specialization')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
