import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card, StatCard } from '@/components/ui/card';
import { Users, UserCheck, ClipboardList, Pill } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Administration' };

export default async function AdminDashboardPage() {
  await requireRole('admin');
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [profilesRes, studentsRes, visitsRes, rxRes] = await Promise.all([
    supabase.from('profiles').select('id, role, status'),
    supabase.from('students').select('id, is_claimed'),
    supabase.from('visits').select('id').eq('visit_date', today),
    supabase.from('prescriptions').select('id').in('status', ['pending', 'ready', 'partially_dispensed']),
  ]);

  const profiles = profilesRes.data ?? [];
  const students = studentsRes.data ?? [];

  const activeStaff = profiles.filter((p) => p.role !== 'student' && p.status === 'active').length;
  const totalStaff = profiles.filter((p) => p.role !== 'student').length;
  const claimedStudents = students.filter((s) => s.is_claimed).length;
  const totalStudents = students.length;
  const visitsToday = visitsRes.data?.length ?? 0;
  const pendingRx = rxRes.data?.length ?? 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
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
          label="Visits today"
          value={visitsToday}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Pending prescriptions"
          value={pendingRx}
          icon={<Pill className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/staff">
          <Card className="hover:border-blue-300 transition-colors">
            <p className="text-sm font-semibold text-slate-800">Staff management</p>
            <p className="text-xs text-slate-500 mt-1">Add staff, change roles, activate / deactivate.</p>
          </Card>
        </Link>
        <Link href="/admin/audit">
          <Card className="hover:border-blue-300 transition-colors">
            <p className="text-sm font-semibold text-slate-800">Audit log</p>
            <p className="text-xs text-slate-500 mt-1">Who checked in, booked, dispensed, changed staff.</p>
          </Card>
        </Link>
        <Link href="/admin/settings">
          <Card className="hover:border-blue-300 transition-colors">
            <p className="text-sm font-semibold text-slate-800">Clinic settings</p>
            <p className="text-xs text-slate-500 mt-1">Name, phone, hours, stock threshold.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
