import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Student, Profile } from '@/types/database';

export const metadata: Metadata = { title: 'My Profile' };

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, studentRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('students').select('*').eq('profile_id', user.id).single(),
  ]);

  const profile = profileRes.data as Profile | null;
  const student = studentRes.data as Student | null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-heading-2">My Profile</h1>
        <p className="text-body mt-1">Your personal and academic information.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Account</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Full name</p>
              <p className="font-medium text-slate-800">{profile?.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Email</p>
              <p className="font-medium text-slate-800">{profile?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Phone</p>
              <p className="font-medium text-slate-800">{profile?.phone ?? '—'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Academic Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Registration number</p>
              <p className="font-medium text-slate-800 font-mono">{student?.registration_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Department</p>
              <p className="font-medium text-slate-800">{student?.department ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Faculty</p>
              <p className="font-medium text-slate-800">{student?.faculty ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Level</p>
              <p className="font-medium text-slate-800">{student?.level ? `${student.level} Level` : '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Date of birth</p>
              <p className="font-medium text-slate-800">{formatDate(student?.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Gender</p>
              <p className="font-medium text-slate-800 capitalize">{student?.gender ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
