'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createStaffSchema, type CreateStaffInput } from '@/lib/validations/staff';
import { createStaffAccount } from '@/features/admin/actions';
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
  const [newPassword, setNewPassword] = React.useState<string | null>(null);
  const [newEmail, setNewEmail] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const router = useRouter();
  const { success } = useToast();

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
    setNewPassword(null);

    const res = await createStaffAccount({
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      department: data.department,
      employee_id: data.employee_id,
      specialization: data.specialization,
    });

    if (!res.success) {
      setServerError(res.error ?? 'Failed to create staff.');
      return;
    }

    // Show login once — admin tells them in person (no email needed)
    setNewEmail(data.email.trim().toLowerCase());
    setNewPassword(res.tempPassword ?? '');
    success('Staff member created', `${data.full_name} can now sign in.`);
    reset();
    router.refresh();
  };

  const handleClose = () => {
    setOpen(false);
    reset();
    setServerError(null);
    setNewPassword(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(`Email: ${newEmail}  Password: ${newPassword}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
        description="Create a staff login. Tell them the password in person — they can change it later."
        size="md"
      >
        {newPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm font-semibold text-emerald-800 mb-1">Account ready — copy once</p>
              <p className="text-sm text-slate-700">Email: <code className="font-mono">{newEmail}</code></p>
              <p className="text-sm text-slate-700">Password: <code className="font-mono font-bold">{newPassword}</code></p>
              <p className="text-xs text-slate-500 mt-2">You won&apos;t see this again. Share it with them now.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy login'}
              </Button>
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
}
