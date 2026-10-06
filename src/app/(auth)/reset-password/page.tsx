import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { AuthLayout } from '@/components/layout/auth-layout';

export const metadata: Metadata = {
  title: 'Set New Password',
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Set new password" subtitle="Choose a password you will remember.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
