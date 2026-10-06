import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { RestockButton } from '@/features/pharmacy/components/restock-button';
import { INVENTORY_STATUS_LABELS, INVENTORY_STATUS_COLORS } from '@/lib/constants';
import type { InventoryStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Inventory' };
export const revalidate = 0;

export default async function PharmacyInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole('pharmacist', 'admin');
  const supabase = await createClient();
  const { q } = await searchParams;
  const query = (q ?? '').trim().slice(0, 40);

  let req = supabase
    .from('inventory_items')
    .select(`
      id, quantity_in_stock, low_stock_threshold, status,
      expiry_date, location, last_restocked_at,
      medications ( id, name, generic_name, unit, category )
    `)
    .order('status');

  const { data } = await req;
  const all = (data ?? []) as unknown as Array<{
    medications?: { name?: string; generic_name?: string } | Array<{ name?: string; generic_name?: string }>;
  }>;
  // Simple name filter in app (medication names are few, no extra index needed)
  const filtered = query
    ? all.filter((i) => {
        const med = Array.isArray(i.medications) ? i.medications[0] : i.medications;
        return `${med?.name ?? ''} ${med?.generic_name ?? ''}`.toLowerCase().includes(query.toLowerCase());
      })
    : all;
  const items = filtered as unknown as NonNullable<typeof data>;
  const outCount = items.filter((i) => i.status === 'out_of_stock').length;
  const lowCount = items.filter((i) => i.status === 'low_stock').length;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-heading-2">Inventory</h1>
            <p className="text-body mt-1">
              {items.length} medications ·{' '}
              {outCount > 0 && (
                <span className="text-red-600 font-medium">{outCount} out of stock</span>
              )}
              {outCount > 0 && lowCount > 0 && ' · '}
              {lowCount > 0 && (
                <span className="text-amber-600 font-medium">{lowCount} low stock</span>
              )}
              {outCount === 0 && lowCount === 0 && (
                <span className="text-emerald-600 font-medium">all levels healthy</span>
              )}
            </p>
          </div>
          <form action="/pharmacy/inventory" method="get" className="w-full sm:w-64">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search drug name…"
              autoComplete="off"
              className="input-base w-full py-2 text-sm"
            />
          </form>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Medication
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                  Category
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Stock
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item: any) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {item.medications?.name ?? '—'}
                    </p>
                    {item.medications?.generic_name && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.medications.generic_name}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs hidden md:table-cell">
                    {item.medications?.category ?? '—'}
                  </td>
                  <td className="px-5 py-4">
                    <p>
                      <span className="font-semibold text-slate-800">
                        {item.quantity_in_stock}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">
                        {item.medications?.unit}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Low at {item.low_stock_threshold}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      label={INVENTORY_STATUS_LABELS[item.status as InventoryStatus]}
                      colorClass={INVENTORY_STATUS_COLORS[item.status as InventoryStatus]}
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <RestockButton
                      inventoryItemId={item.id}
                      medicationId={item.medications?.id ?? ''}
                      medicationName={item.medications?.name ?? ''}
                      currentStock={item.quantity_in_stock}
                      unit={item.medications?.unit ?? 'units'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
