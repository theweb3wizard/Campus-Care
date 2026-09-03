import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import {
  getOperationalSummary,
  getDailyVisitTrend,
  getInventoryAlerts,
} from '@/features/management/actions';
import { createClient } from '@/lib/supabase/server';
import { Card, StatCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { VisitTrendChart } from '@/features/management/components/visit-trend-chart';
import { INVENTORY_STATUS_LABELS, INVENTORY_STATUS_COLORS } from '@/lib/constants';
import { TrendingUp, Pill, Package, Users, Activity } from 'lucide-react';
import type { InventoryStatus } from '@/types/database';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Analytics' };
export const revalidate = 300;

export default async function ManagementAnalyticsPage() {
  await requireRole('management', 'admin');
  const supabase = await createClient();

  const [summary, trend, alerts] = await Promise.all([
    getOperationalSummary(),
    getDailyVisitTrend(),
    getInventoryAlerts(),
  ]);

  // Prescription dispensing breakdown
  const { data: rxBreakdown } = await supabase
    .from('prescriptions')
    .select('status')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const rxStatusMap = new Map<string, number>();
  (rxBreakdown ?? []).forEach((rx: { status: string }) => {
    rxStatusMap.set(rx.status, (rxStatusMap.get(rx.status) ?? 0) + 1);
  });

  // Recent inventory transactions (last 10)
  const { data: recentTransactions } = await supabase
    .from('inventory_transactions')
    .select(`
      id, transaction_type, quantity_change, quantity_after, created_at,
      medications ( name, unit )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  const txTypes: Record<string, string> = {
    dispensing: 'Dispensed',
    restock: 'Restocked',
    adjustment: 'Adjusted',
    expired: 'Expired',
    returned: 'Returned',
  };

  return (
    <div className="p-6">
      <div className="mb-7">
        <h1 className="text-heading-2">Analytics</h1>
        <p className="text-body mt-1">
          Operational metrics — aggregated, no identifiable patient data.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Visits (30 days)"
          value={summary.total_visits_30d}
          description={`${summary.total_visits_7d} in past 7 days`}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Students registered"
          value={summary.total_students}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Prescriptions (30d)"
          value={summary.total_prescriptions_30d}
          icon={<Pill className="h-5 w-5" />}
        />
        <StatCard
          label="Dispensed (30d)"
          value={summary.dispensed_prescriptions_30d}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visit trend */}
        <div className="lg:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-5">
              Daily visit trend — last 30 days
            </h3>
            <VisitTrendChart data={trend} />
          </Card>
        </div>

        {/* Prescription status breakdown */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Prescription outcomes (30d)
            </h3>
            {rxStatusMap.size === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {Array.from(rxStatusMap.entries()).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 capitalize">
                      {status.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{
                            width: `${(count / summary.total_prescriptions_30d) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-6 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Inventory alerts */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Stock alerts
            </h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-emerald-600 text-center py-4">
                All stock levels healthy.
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.medication_name} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {alert.medication_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {alert.quantity_in_stock}/{alert.low_stock_threshold} {alert.unit}
                      </p>
                    </div>
                    <StatusBadge
                      label={INVENTORY_STATUS_LABELS[alert.status as InventoryStatus]}
                      colorClass={INVENTORY_STATUS_COLORS[alert.status as InventoryStatus]}
                      dot={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent inventory transactions */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Recent stock movements
            </h3>
            {(recentTransactions ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No movements yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(recentTransactions ?? []).map((tx: any) => (
                  <div key={tx.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {tx.medications?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {txTypes[tx.transaction_type] ?? tx.transaction_type} ·{' '}
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={[
                        'text-xs font-semibold shrink-0',
                        tx.quantity_change < 0 ? 'text-rose-600' : 'text-emerald-600',
                      ].join(' ')}
                    >
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}{' '}
                      {tx.medications?.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
