import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { getPendingPrescriptions } from '@/features/prescriptions/actions';
import { Card, StatCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { PRESCRIPTION_STATUS_LABELS, PRESCRIPTION_STATUS_COLORS, INVENTORY_STATUS_COLORS, INVENTORY_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { Pill, Package, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { PrescriptionStatus, InventoryStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Pharmacy' };
export const revalidate = 0;

export default async function PharmacyDashboardPage() {
  await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  const [prescriptions, inventoryRes] = await Promise.all([
    getPendingPrescriptions(),
    supabase
      .from('inventory_items')
      .select('id, status, quantity_in_stock, low_stock_threshold, medications(name, unit)')
      .order('status'),
  ]);

  const inventory = inventoryRes.data ?? [];
  const lowStockItems = inventory.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');
  const outOfStockCount = inventory.filter((i) => i.status === 'out_of_stock').length;
  const dispensedToday = 0; // would query by dispensed_at date in production

  return (
    <div className="p-4 sm:p-6">
      <QueueSubscriber channel="pharmacy-dashboard" />

      <div className="mb-7">
        <h1 className="text-heading-2">Pharmacy</h1>
        <p className="text-body mt-1">
          {new Date().toLocaleDateString('en-NG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending prescriptions"
          value={prescriptions.length}
          icon={<Pill className="h-5 w-5" />}
        />
        <StatCard
          label="Low / out of stock"
          value={lowStockItems.length}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Out of stock"
          value={outOfStockCount}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Total medications"
          value={inventory.length}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pending prescriptions */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Pending prescriptions
            </h2>
            <Link href="/pharmacy/prescriptions" className="text-xs text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <Card padding="none">
            {prescriptions.length === 0 ? (
              <EmptyState
                icon={<Pill className="h-7 w-7" />}
                title="No pending prescriptions"
                description="Prescriptions from doctors will appear here in real time."
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {prescriptions.slice(0, 6).map((rx) => (
                  <Link
                    key={rx.id}
                    href={`/pharmacy/prescriptions/${rx.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {rx.patient.full_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {rx.items.map((i) => i.medication_name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge
                        label={PRESCRIPTION_STATUS_LABELS[rx.status as PrescriptionStatus]}
                        colorClass={PRESCRIPTION_STATUS_COLORS[rx.status as PrescriptionStatus]}
                      />
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Stock alerts */}
        <div className="xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Stock alerts</h2>
            <Link href="/pharmacy/inventory" className="text-xs text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <Card padding="none">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">All stock levels are healthy.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {item.medications?.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.quantity_in_stock} {item.medications?.unit} remaining
                      </p>
                    </div>
                    <StatusBadge
                      label={INVENTORY_STATUS_LABELS[item.status as InventoryStatus]}
                      colorClass={INVENTORY_STATUS_COLORS[item.status as InventoryStatus]}
                      dot={false}
                    />
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
