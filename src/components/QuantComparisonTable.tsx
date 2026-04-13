'use client';

import type { QuantComparison } from '@/lib/types';

interface QuantComparisonTableProps {
  comparisons: QuantComparison[];
  availableVRAM: number;
}

export function QuantComparisonTable({ comparisons, availableVRAM }: QuantComparisonTableProps) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-text-primary mb-4">Quantization Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="text-left px-4 py-2 text-text-secondary font-semibold uppercase tracking-wider text-[0.75rem]">
                Quantization
              </th>
              <th className="text-left px-4 py-2 text-text-secondary font-semibold uppercase tracking-wider text-[0.75rem]">
                Quality
              </th>
              <th className="text-right px-4 py-2 text-text-secondary font-semibold uppercase tracking-wider text-[0.75rem]">
                Total VRAM
              </th>
              <th className="text-right px-4 py-2 text-text-secondary font-semibold uppercase tracking-wider text-[0.75rem]">
                Fits?
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, i) => (
              <tr
                key={row.quant}
                className={`${
                  row.recommended ? 'bg-accent-primary/10' : i % 2 === 0 ? '' : 'bg-bg-secondary'
                } h-11`}
              >
                <td className="px-4 py-2 font-mono text-text-primary">
                  {row.quant}
                  {row.recommended && (
                    <span className="ml-2 text-[0.625rem] font-sans text-accent-primary font-medium">
                      RECOMMENDED
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-text-secondary">{row.quality}</td>
                <td className="px-4 py-2 text-right font-mono text-text-primary">
                  {row.totalVRAM.toFixed(1)} GB
                </td>
                <td className="px-4 py-2 text-right">
                  {row.fits ? (
                    <span className="text-status-success">
                      <span aria-hidden="true">{'\u2713'}</span> Fits
                    </span>
                  ) : (
                    <span className="text-status-error">
                      <span aria-hidden="true">{'\u2715'}</span> Exceeds {availableVRAM} GB
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
