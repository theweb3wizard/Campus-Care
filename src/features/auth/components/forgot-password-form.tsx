'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';

export function ForgotPasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    const supabase = createClient();
    const email = data.email.trim().toLowerCase();

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 py-2">
        <p className="text-sm text-slate-600">
          If an account exists for that email, we sent a reset link. Check your inbox and spam folder.
        </p>
        <Link href="/login" className="text-blue-600 text-sm font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-sm text-slate-500 -mt-2">
        Enter your account email. We will send you a link to set a new password.
      </p>
      {serverError && <InlineError message={serverError} />}
      <Input
        label="Email address"
        type="email"
        placeholder="you@university.edu.ng"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
      <p className="text-sm text-center text-slate-500">
        Remember it?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
