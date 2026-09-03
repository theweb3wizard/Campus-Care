import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/types/database';

export const metadata: Metadata = { title: 'Audit Log' };

export default async function AuditLogPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  const logs = (data ?? []) as (AuditLog & {
    profiles: { full_name: string; email: string } | null;
  })[];

  return (
    <div className="p-6">
      <div className="mb-7">
        <h1 className="text-heading-2">Audit Log</h1>
        <p className="text-body mt-1">Last 100 security and operational events.</p>
      </div>

      <Card padding="none">
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">No audit events recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Time</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {log.profiles?.full_name ?? 'System'}
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                      {log.resource_type}
                      {log.resource_id && (
                        <span className="text-xs text-slate-300 ml-1 font-mono">
                          {log.resource_id.slice(0, 8)}…
                        </span>
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
