import type { Metadata } from 'next';
import { EmergencyForm } from '@/features/emergency/components/emergency-form';
import { AuthLayout } from '@/components/layout/auth-layout';

export const metadata: Metadata = { title: 'Emergency' };

export default function EmergencyPage() {
  return (
    <AuthLayout title="Emergency alert" subtitle="No login needed. The front desk sees this instantly.">
      <EmergencyForm />
    </AuthLayout>
  );
}
