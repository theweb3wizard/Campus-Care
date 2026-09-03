import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ClinicSettingsForm } from '@/features/admin/components/clinic-settings-form';
import type { ClinicSetting } from '@/types/database';

export const metadata: Metadata = { title: 'Clinic Settings' };

export default async function ClinicSettingsPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data } = await supabase
    .from('clinic_settings')
    .select('*')
    .order('key');

  const settings = (data ?? []) as ClinicSetting[];

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-heading-2">Clinic Settings</h1>
        <p className="text-body mt-1">Configure clinic-wide operational settings.</p>
      </div>
      <Card>
        <ClinicSettingsForm settings={settings} />
      </Card>
    </div>
  );
}
