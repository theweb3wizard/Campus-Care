import type { Metadata } from 'next';
import { OnboardingFlow } from '@/features/auth/components/onboarding-flow';
import { AuthLayout } from '@/components/layout/auth-layout';

export const metadata: Metadata = {
  title: 'Get Started',
};

export default function OnboardingPage() {
  return (
    <AuthLayout
      title="Get started"
      subtitle="Verify your identity to access your clinic record."
    >
      <OnboardingFlow />
    </AuthLayout>
  );
}
