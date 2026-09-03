'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  studentVerificationSchema,
  studentSetupSchema,
  type StudentVerificationInput,
  type StudentSetupInput,
} from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';

type Step = 'verify' | 'setup' | 'complete';

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'verify', label: 'Verify' },
    { key: 'setup', label: 'Set up' },
    { key: 'complete', label: 'Done' },
  ];
  const order: Step[] = ['verify', 'setup', 'complete'];
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center gap-2 mb-7">
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-400',
                ].join(' ')}
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={[
                  'text-xs font-medium',
                  active ? 'text-slate-700' : 'text-slate-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={[
                  'flex-1 h-px',
                  done ? 'bg-emerald-300' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Verify identity ──────────────────────────────────────────────────
// Only checks that the student record exists and is unclaimed.
// Does NOT read sensitive data. No role is assigned here.

function VerifyStep({
  onSuccess,
}: {
  onSuccess: (regNumber: string, email: string, fullName: string) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentVerificationInput>({
    resolver: zodResolver(studentVerificationSchema),
  });

  const onSubmit = async (data: StudentVerificationInput) => {
    setServerError(null);
    const supabase = createClient();

    const reg = data.registration_number.toUpperCase().trim();
    const email = data.institutional_email.toLowerCase().trim();

    // Check existence and claimed status — no sensitive columns selected
    const { data: student, error } = await supabase
      .from('students')
      .select('full_name, is_claimed')
      .eq('registration_number', reg)
      .eq('institutional_email', email)
      .maybeSingle();

    if (error || !student) {
      setServerError(
        'We could not find an account matching those details. Check your registration number and institutional email, then try again.'
      );
      return;
    }

    if (student.is_claimed) {
      setServerError('This account has already been set up. Please sign in instead.');
      return;
    }

    onSuccess(reg, email, student.full_name);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-sm text-slate-500 -mt-2 mb-1">
        Enter your university details to verify your identity before creating
        your CampusCare account.
      </p>

      {serverError && <InlineError message={serverError} />}

      <Input
        label="Registration number"
        type="text"
        placeholder="e.g. CSC/2021/001"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        required
        hint="Your university student registration number."
        error={errors.registration_number?.message}
        {...register('registration_number')}
      />

      <Input
        label="Institutional email"
        type="email"
        placeholder="you@university.edu.ng"
        autoComplete="email"
        required
        hint="Your university-issued email address."
        error={errors.institutional_email?.message}
        {...register('institutional_email')}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        rightIcon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
        className="w-full"
      >
        {isSubmitting ? 'Checking…' : 'Verify identity'}
      </Button>

      <p className="text-sm text-center text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

// ─── Step 2: Create account and claim student record ─────────────────────────
// 1. Call supabase.auth.signUp() — NO role in metadata (server defaults to student)
// 2. Sign in immediately so auth.uid() is available
// 3. Call claim_student() RPC — runs SECURITY DEFINER server-side
// 4. Update optional phone on profile

function SetupStep({
  registrationNumber,
  email,
  fullName,
  onSuccess,
}: {
  registrationNumber: string;
  email: string;
  fullName: string;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentSetupInput>({
    resolver: zodResolver(studentSetupSchema),
    defaultValues: { accepts_privacy: false, accepts_terms: false },
  });

  const onSubmit = async (data: StudentSetupInput) => {
    setServerError(null);
    const supabase = createClient();

    // ── 1. Create auth account — NO role in metadata ──────────────────────────
    // Role is always defaulted to 'student' by handle_new_user() on the server.
    // Never send role from the client.
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          // Only safe, non-privileged metadata
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setServerError('An account with this email already exists. Please sign in instead.');
      } else {
        setServerError(signUpError.message);
      }
      return;
    }

    if (!authData.user) {
      setServerError('Account creation failed. Please try again.');
      return;
    }

    // ── 2. Sign in immediately so auth.uid() is set for the RPC call ─────────
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (signInError) {
      // Account was created — direct them to sign in
      onSuccess();
      return;
    }

    // ── 3. Call claim_student() — SECURITY DEFINER runs server-side ──────────
    // This function: verifies reg number + email, links profile_id, sets is_claimed=true,
    // ensures role=student on the profile. The client cannot fake any of this.
    const { data: claimResult, error: claimError } = await supabase.rpc(
      'claim_student',
      {
        p_registration_number: registrationNumber,
        p_institutional_email: email,
      }
    );

    if (claimError) {
      setServerError('Failed to link your student record: ' + claimError.message);
      await supabase.auth.signOut();
      return;
    }

    const result = claimResult as { success: boolean; error?: string } | null;
    if (!result?.success) {
      setServerError(result?.error ?? 'Failed to link student record. Please contact support.');
      await supabase.auth.signOut();
      return;
    }

    // ── 4. Update optional phone ──────────────────────────────────────────────
    if (data.phone) {
      await supabase
        .from('profiles')
        .update({ phone: data.phone })
        .eq('id', authData.user.id);
    }

    // Sign out — user will sign in properly from the login page
    await supabase.auth.signOut();
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Identity confirmed banner */}
      <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-800">{fullName}</p>
          <p className="text-xs text-emerald-600">{registrationNumber}</p>
        </div>
      </div>

      {serverError && <InlineError message={serverError} />}

      <Input
        label="Create password"
        type="password"
        placeholder="Minimum 8 characters"
        autoComplete="new-password"
        required
        hint="At least 8 characters with one uppercase letter and one number."
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <Input
        label="Phone number (optional)"
        type="tel"
        placeholder="+234 XXX XXX XXXX"
        autoComplete="tel"
        hint="Used only for urgent clinic communication."
        error={errors.phone?.message}
        {...register('phone')}
      />

      {/* Consent */}
      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            {...register('accepts_privacy')}
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
            I acknowledge that my health information will be processed in
            accordance with the university clinic&apos;s privacy notice.
          </span>
        </label>
        {errors.accepts_privacy && (
          <p className="text-xs text-rose-600 ml-7" role="alert">
            {errors.accepts_privacy.message}
          </p>
        )}

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            {...register('accepts_terms')}
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
            I agree to the clinic terms of use.
          </span>
        </label>
        {errors.accepts_terms && (
          <p className="text-xs text-rose-600 ml-7" role="alert">
            {errors.accepts_terms.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}

// ─── Step 3: Complete ─────────────────────────────────────────────────────────

function CompleteStep() {
  const router = useRouter();

  return (
    <div className="text-center space-y-5 py-2">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Account created</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Your CampusCare account is ready. Sign in to access your clinic dashboard.
        </p>
      </div>
      <div className="space-y-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push('/login')}
        >
          Sign in now
        </Button>
        <p className="text-xs text-slate-400">
          If you don&apos;t see a confirmation email, check your spam folder.
        </p>
      </div>
    </div>
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const [step, setStep] = React.useState<Step>('verify');
  const [regNumber, setRegNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');

  return (
    <div>
      <StepIndicator current={step} />

      {step === 'verify' && (
        <VerifyStep
          onSuccess={(r, e, n) => {
            setRegNumber(r);
            setEmail(e);
            setFullName(n);
            setStep('setup');
          }}
        />
      )}

      {step === 'setup' && (
        <SetupStep
          registrationNumber={regNumber}
          email={email}
          fullName={fullName}
          onSuccess={() => setStep('complete')}
        />
      )}

      {step === 'complete' && <CompleteStep />}
    </div>
  );
}
