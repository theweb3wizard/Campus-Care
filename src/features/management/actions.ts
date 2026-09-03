'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyVisitCount {
  date: string;
  count: number;
}

export interface OperationalSummary {
  total_visits_30d: number;
  total_visits_7d: number;
  total_visits_today: number;
  total_students: number;
  total_prescriptions_30d: number;
  dispensed_prescriptions_30d: number;
  avg_queue_length_today: number;
  completed_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface InventoryAlert {
  medication_name: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  status: string;
  unit: string;
}

// ─── Operational summary (aggregated — no patient identifiers) ────────────────

export async function getOperationalSummary(): Promise<OperationalSummary> {
  await requireRole('management', 'admin');
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const [
    visits30d, visits7d, visitsToday,
    studentsRes, prescriptions30d, dispensed30d,
    queueToday, completedToday,
    lowStock, outOfStock,
  ] = await Promise.all([
    supabase.from('visits').select('id', { count: 'exact', head: true }).gte('visit_date', thirtyDaysAgo),
    supabase.from('visits').select('id', { count: 'exact', head: true }).gte('visit_date', sevenDaysAgo),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('visit_date', today),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('prescriptions').select('id', { count: 'exact', head: true }).gte('created_at', `${thirtyDaysAgo}T00:00:00`),
    supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'dispensed').gte('created_at', `${thirtyDaysAgo}T00:00:00`),
    supabase.from('queue_entries').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('status', 'completed').eq('visit_date', today),
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('status', 'low_stock'),
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('status', 'out_of_stock'),
  ]);

  return {
    total_visits_30d: visits30d.count ?? 0,
    total_visits_7d: visits7d.count ?? 0,
    total_visits_today: visitsToday.count ?? 0,
    total_students: studentsRes.count ?? 0,
    total_prescriptions_30d: prescriptions30d.count ?? 0,
    dispensed_prescriptions_30d: dispensed30d.count ?? 0,
    avg_queue_length_today: queueToday.count ?? 0,
    completed_today: completedToday.count ?? 0,
    low_stock_count: lowStock.count ?? 0,
    out_of_stock_count: outOfStock.count ?? 0,
  };
}

// ─── Daily visit counts (last 30 days) ───────────────────────────────────────

export async function getDailyVisitTrend(): Promise<DailyVisitCount[]> {
  await requireRole('management', 'admin');
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('visits')
    .select('visit_date')
    .gte('visit_date', thirtyDaysAgo)
    .not('status', 'in', '("cancelled","no_show")')
    .order('visit_date');

  if (error || !data) return [];

  // Aggregate by date client-side (avoids needing RPC)
  const countMap = new Map<string, number>();
  (data as { visit_date: string }[]).forEach(({ visit_date }) => {
    countMap.set(visit_date, (countMap.get(visit_date) ?? 0) + 1);
  });

  // Fill all 30 days (including zeros)
  const result: DailyVisitCount[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    result.push({ date: d, count: countMap.get(d) ?? 0 });
  }
  return result;
}

// ─── Inventory alerts ─────────────────────────────────────────────────────────

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  await requireRole('management', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_items')
    .select('quantity_in_stock, low_stock_threshold, status, medications(name, unit)')
    .in('status', ['low_stock', 'out_of_stock'])
    .order('status');

  if (error || !data) return [];

  return (data as any[]).map((item) => ({
    medication_name: item.medications?.name ?? '—',
    quantity_in_stock: item.quantity_in_stock,
    low_stock_threshold: item.low_stock_threshold,
    status: item.status,
    unit: item.medications?.unit ?? 'units',
  }));
}

// ─── Visit status breakdown today ────────────────────────────────────────────

export async function getTodayStatusBreakdown(): Promise<
  { status: string; count: number }[]
> {
  await requireRole('management', 'admin');
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('visits')
    .select('status')
    .eq('visit_date', today);

  if (!data) return [];

  const countMap = new Map<string, number>();
  (data as { status: string }[]).forEach(({ status }) => {
    countMap.set(status, (countMap.get(status) ?? 0) + 1);
  });

  return Array.from(countMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}
