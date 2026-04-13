'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { ContextPoint } from '@/lib/types';

interface ContextScalingChartProps {
  points: ContextPoint[];
  availableVRAM: number;
}

function formatContext(value: number): string {
  if (value >= 1024) return `${(value / 1024).toFixed(0)}K`;
  return value.toString();
}

export function ContextScalingChart({ points, availableVRAM }: ContextScalingChartProps) {
  const data = points.map((p) => ({
    context: p.contextLength,
    label: formatContext(p.contextLength),
    vram: parseFloat(p.totalVRAM.toFixed(2)),
  }));

  const maxVRAM = Math.max(
    ...points.map((p) => p.totalVRAM),
    availableVRAM * 1.1,
  );

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-text-primary mb-4">
        Context vs. VRAM
      </h3>
      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#a0a0b8', fontSize: 12 }}
              axisLine={{ stroke: '#2a2a3e' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, Math.ceil(maxVRAM)]}
              tick={{ fill: '#a0a0b8', fontSize: 12 }}
              axisLine={{ stroke: '#2a2a3e' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}GB`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121a',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: '#e8e8ed',
                fontSize: 13,
              }}
              formatter={(value) => [`${Number(value).toFixed(2)} GB`, 'Total VRAM']}
              labelFormatter={(label) => `Context: ${label}`}
            />
            <ReferenceLine
              y={availableVRAM}
              stroke="#ef4444"
              strokeDasharray="6 4"
              label={{
                value: `GPU: ${availableVRAM} GB`,
                fill: '#ef4444',
                fontSize: 11,
                position: 'right',
              }}
            />
            <Area
              type="monotone"
              dataKey="vram"
              fill="#6366f1"
              fillOpacity={0.1}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="vram"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
