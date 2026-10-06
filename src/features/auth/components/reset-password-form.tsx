'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';

export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      setServerError(error.message + ' — Try requesting a new reset link.');
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-sm text-slate-500 -mt-2">Choose a new password. Minimum 8 characters.</p>
      {serverError && <InlineError message={serverError} />}
      <Input
        label="New password"
        type="password"
        placeholder="Minimum 8 characters"
        autoComplete="new-password"
        required
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm new password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}
