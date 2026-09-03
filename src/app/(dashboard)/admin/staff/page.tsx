import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateStaffButton } from '@/features/admin/components/create-staff-button';
import { StaffStatusToggle } from '@/features/admin/components/staff-status-toggle';
import { USER_ROLES } from '@/types/roles';
import type { Profile } from '@/types/database';
import type { UserRole } from '@/types/roles';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Staff Management' };

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  student:      'bg-blue-100 text-blue-700',
  receptionist: 'bg-violet-100 text-violet-700',
  doctor:       'bg-teal-100 text-teal-700',
  pharmacist:   'bg-cyan-100 text-cyan-700',
  admin:        'bg-slate-100 text-slate-700',
  management:   'bg-amber-100 text-amber-700',
};

export default async function StaffManagementPage() {
  const currentProfile = await requireRole('admin');
  const supabase = await createClient();

  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status, last_login_at, created_at')
    .neq('role', 'student')
    .order('created_at', { ascending: false });

  const staff = (staffProfiles ?? []) as Profile[];
  const activeCount = staff.filter((s) => s.status === 'active').length;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-heading-2">Staff Management</h1>
          <p className="text-body mt-1">
            {activeCount} active · {staff.length} total
          </p>
        </div>
        <CreateStaffButton />
      </div>

      <Card padding="none">
        {staff.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-600 mb-1">No staff members yet</p>
            <p className="text-sm text-slate-400">Use the button above to add your first staff member.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Last login</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{member.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_COLORS[member.role as UserRole]}`}>
                        {USER_ROLES[member.role as UserRole]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 hidden md:table-cell">{member.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs hidden lg:table-cell">
                      {member.last_login_at ? formatDateTime(member.last_login_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={member.status === 'active' ? 'success' : 'neutral'} dot>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Don't show toggle for current user */}
                      {member.id !== currentProfile.id && (
                        <StaffStatusToggle
                          profileId={member.id}
                          currentStatus={member.status}
                          fullName={member.full_name}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
