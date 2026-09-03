'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { ROLE_HOME_ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';
import type { UserRole } from '@/types/roles';
import type { Profile } from '@/types/database';

const ERROR_MESSAGES: Record<string, string> = {
  account_inactive:
    'Your account has been deactivated. Contact the clinic administrator.',
  no_profile: 'Account setup is incomplete. Please contact support.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const errorParam = searchParams.get('error');

  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? null) : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });

    if (signInError) {
      if (
        signInError.message.toLowerCase().includes('invalid') ||
        signInError.message.toLowerCase().includes('credentials')
      ) {
        setServerError('Incorrect email or password. Please try again.');
      } else {
        setServerError(signInError.message);
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setServerError('Sign-in failed. Please try again.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setServerError('Account setup is incomplete. Please contact support.');
      return;
    }

    const p = profile as Pick<Profile, 'role' | 'status'>;

    if (p.status === 'inactive' || p.status === 'suspended') {
      await supabase.auth.signOut();
      setServerError(ERROR_MESSAGES.account_inactive);
      return;
    }

    // Update last login timestamp (best-effort, non-blocking)
    supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {});

    const destination =
      nextUrl ?? ROLE_HOME_ROUTES[p.role as UserRole];

    router.push(destination);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
        {...register('password')}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        leftIcon={!isSubmitting ? <LogIn className="h-4 w-4" /> : undefined}
        className="w-full mt-2"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-sm text-center text-slate-500 pt-1">
        First time here?{' '}
        <Link
          href="/onboarding"
          className="text-blue-600 font-medium hover:underline"
        >
          Get started
        </Link>
      </p>
    </form>
  );
}
