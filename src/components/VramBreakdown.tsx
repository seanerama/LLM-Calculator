'use client';

import type { VramBreakdown as VramBreakdownType } from '@/lib/types';

interface VramBreakdownProps {
  breakdown: VramBreakdownType;
}

export function VramBreakdown({ breakdown }: VramBreakdownProps) {
  const total = breakdown.totalVRAM;
  const maxBar = Math.max(total, breakdown.availableVRAM);

  const weightPct = (breakdown.weightVRAM / maxBar) * 100;
  const kvPct = (breakdown.kvCacheVRAM / maxBar) * 100;
  const overheadPct = (breakdown.frameworkOverhead / maxBar) * 100;
  const thresholdPct = (breakdown.availableVRAM / maxBar) * 100;

  const items = [
    { label: 'Model Weights', value: breakdown.weightVRAM, color: 'bg-chart-weights', dot: 'bg-chart-weights' },
    { label: 'KV Cache', value: breakdown.kvCacheVRAM, color: 'bg-chart-kv-cache', dot: 'bg-chart-kv-cache' },
    { label: 'Framework Overhead', value: breakdown.frameworkOverhead, color: 'bg-chart-overhead', dot: 'bg-chart-overhead' },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-text-primary mb-4">VRAM Breakdown</h3>

      {/* Stacked bar */}
      <div className="relative h-10 bg-bg-tertiary rounded-lg overflow-hidden mb-2">
        <div className="absolute inset-0 flex">
          <div className="bg-chart-weights h-full" style={{ width: `${weightPct}%` }} />
          <div className="bg-chart-kv-cache h-full" style={{ width: `${kvPct}%` }} />
          <div className="bg-chart-overhead h-full" style={{ width: `${overheadPct}%` }} />
        </div>
        {/* Threshold line */}
        <div
          className="absolute top-0 bottom-0 border-r-2 border-dashed border-status-error"
          style={{ left: `${Math.min(thresholdPct, 100)}%` }}
        />
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm ${item.dot}`} />
              <span className="text-text-secondary text-[0.8125rem]">{item.label}</span>
            </div>
            <span className="font-mono text-text-primary text-[0.8125rem]">
              {item.value.toFixed(2)} GB
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-border-default">
          <span className="text-text-primary text-[0.9375rem] font-semibold">Total</span>
          <span className="font-mono text-text-primary text-[0.9375rem] font-bold">
            {total.toFixed(2)} GB
          </span>
        </div>
      </div>
    </div>
  );
}
