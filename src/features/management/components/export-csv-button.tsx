'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExportCsvButton({
  trend,
  breakdown,
}: {
  trend: { date: string; count: number }[];
  breakdown: Record<string, number>;
}) {
  const handleExport = () => {
    const lines = ['section,date_or_status,count'];
    trend.forEach((t) => lines.push(`visits,${t.date},${t.count}`));
    Object.entries(breakdown).forEach(([s, c]) => lines.push(`prescriptions,${s},${c}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
      Export CSV
    </Button>
  );
}
