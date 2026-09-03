import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import {
  getOperationalSummary,
  getDailyVisitTrend,
  getInventoryAlerts,
  getTodayStatusBreakdown,
} from '@/features/management/actions';
import { Card, StatCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { VisitTrendChart } from '@/features/management/components/visit-trend-chart';
import { INVENTORY_STATUS_LABELS, INVENTORY_STATUS_COLORS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '@/lib/constants';
import {
  Users, ClipboardList, Pill, TrendingUp,
  CheckCircle2, AlertTriangle, Activity, Package,
} from 'lucide-react';
import type { InventoryStatus, VisitStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Operations Overview' };
export const revalidate = 300; // Refresh every 5 minutes

export default async function ManagementDashboardPage() {
  await requireRole('management', 'admin');

  const [summary, trend, alerts, todayBreakdown] = await Promise.all([
    getOperationalSummary(),
    getDailyVisitTrend(),
    getInventoryAlerts(),
    getTodayStatusBreakdown(),
  ]);

  const dispensingRate =
    summary.total_prescriptions_30d > 0
      ? Math.round((summary.dispensed_prescriptions_30d / summary.total_prescriptions_30d) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-7">
        <h1 className="text-heading-2">Operations Overview</h1>
        <p className="text-body mt-1">
          Aggregated clinic metrics — no identifiable patient data.
        </p>
      </div>

      {/* ── Today ── */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Today
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Visits today"
          value={summary.total_visits_today}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Completed today"
          value={summary.completed_today}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Queue entries today"
          value={summary.avg_queue_length_today}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Low / out of stock"
          value={summary.low_stock_count + summary.out_of_stock_count}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* ── 30 Day period ── */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 mt-2">
        Last 30 days
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total visits"
          value={summary.total_visits_30d}
          description={`${summary.total_visits_7d} in last 7 days`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Registered students"
          value={summary.total_students}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Prescriptions issued"
          value={summary.total_prescriptions_30d}
          icon={<Pill className="h-5 w-5" />}
        />
        <StatCard
          label="Dispensing rate"
          value={`${dispensingRate}%`}
          description={`${summary.dispensed_prescriptions_30d} dispensed`}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visit trend chart */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-5">
              Visit trend — last 30 days
            </h3>
            <VisitTrendChart data={trend} />
          </Card>
        </div>

        {/* Today's breakdown */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Today&apos;s visit breakdown
            </h3>
            {todayBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No visits recorded today.
              </p>
            ) : (
              <div className="space-y-2">
                {todayBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <StatusBadge
                      label={VISIT_STATUS_LABELS[item.status as VisitStatus] ?? item.status}
                      colorClass={VISIT_STATUS_COLORS[item.status as VisitStatus] ?? 'bg-slate-100 text-slate-600'}
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Inventory alerts */}
          {alerts.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Inventory alerts
              </h3>
              <div className="space-y-2.5">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.medication_name} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {alert.medication_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {alert.quantity_in_stock} {alert.unit} remaining
                      </p>
                    </div>
                    <StatusBadge
                      label={INVENTORY_STATUS_LABELS[alert.status as InventoryStatus]}
                      colorClass={INVENTORY_STATUS_COLORS[alert.status as InventoryStatus]}
                      dot={false}
                    />
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-xs text-slate-400">
                    +{alerts.length - 5} more items
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
