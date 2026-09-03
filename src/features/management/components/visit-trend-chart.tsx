import * as React from 'react';
import type { DailyVisitCount } from '@/features/management/actions';

interface Props {
  data: DailyVisitCount[];
}

export function VisitTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-sm text-slate-400">
        No visit data available.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Show every 5th label to avoid crowding
  const labelInterval = Math.ceil(data.length / 6);

  return (
    <div className="w-full">
      {/* Bar chart */}
      <div className="flex items-end gap-1 h-36" role="img" aria-label="Daily visit trend chart">
        {data.map((d, i) => {
          const heightPct = (d.count / maxCount) * 100;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              {/* Tooltip on hover */}
              <div className="relative flex-1 w-full flex items-end">
                <div
                  title={`${d.date}: ${d.count} visit${d.count !== 1 ? 's' : ''}`}
                  className="w-full rounded-t-sm transition-colors bg-blue-200 group-hover:bg-blue-400"
                  style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%` }}
                  aria-label={`${d.date}: ${d.count} visits`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % labelInterval === 0 && (
              <span className="text-[10px] text-slate-400">
                {new Date(d.date + 'T00:00:00').toLocaleDateString('en-NG', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <p className="text-xs text-slate-400 mt-2 text-center">
        Daily clinic visits — last 30 days (peak: {maxCount})
      </p>
    </div>
  );
}
