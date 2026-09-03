import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import type { UserRole } from '@/types/roles';
import type { Profile } from '@/types/database';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) redirect('/login?error=no_profile');

  const p = profile as Pick<Profile, 'id' | 'role' | 'full_name' | 'email' | 'status'>;

  if (p.status === 'inactive' || p.status === 'suspended') {
    redirect('/login?error=account_inactive');
  }

  return (
    <DashboardLayout
      role={p.role as UserRole}
      userName={p.full_name}
      profileId={p.id}
    >
      {children}
    </DashboardLayout>
  );
}
