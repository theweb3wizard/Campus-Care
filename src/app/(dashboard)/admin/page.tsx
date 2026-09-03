import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card, StatCard } from '@/components/ui/card';
import { Users, UserCheck, ShieldCheck, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminDashboardPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const [profilesRes, studentsRes] = await Promise.all([
    supabase.from('profiles').select('id, role, status'),
    supabase.from('students').select('id, is_claimed', { count: 'exact' }),
  ]);

  const profiles = profilesRes.data ?? [];
  const students = studentsRes.data ?? [];

  const activeStaff = profiles.filter((p) => p.role !== 'student' && p.status === 'active').length;
  const totalStaff = profiles.filter((p) => p.role !== 'student').length;
  const claimedStudents = students.filter((s) => s.is_claimed).length;
  const totalStudents = students.length;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-heading-2">Administration</h1>
          <p className="text-body mt-1">Manage staff, roles, and clinic settings.</p>
        </div>
        <Link href="/admin/staff">
          <Button variant="primary" size="sm" leftIcon={<Users className="h-4 w-4" />}>
            Manage staff
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active staff"
          value={activeStaff}
          description={`of ${totalStaff} total`}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Registered students"
          value={claimedStudents}
          description={`of ${totalStudents} provisioned`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Security policies"
          value="Active"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="System"
          value="Online"
          icon={<Settings className="h-5 w-5" />}
        />
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          Staff management, clinic settings, and audit logs coming in Phase 6.
        </p>
      </Card>
    </div>
  );
}
