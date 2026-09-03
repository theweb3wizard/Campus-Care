import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/components/layout/auth-layout';
import { LoadingSpinner } from '@/components/feedback/loading';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign In',
  description: `Sign in to ${APP_NAME} — university clinic management platform.`,
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CampusCare account."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
