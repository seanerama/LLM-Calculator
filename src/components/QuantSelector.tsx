'use client';

import type { QuantType } from '@/lib/types';
import { QUANT_TABLE, QUANT_ORDER } from '@/lib/vramCalc';

interface QuantSelectorProps {
  selected: QuantType;
  onSelect: (quant: QuantType) => void;
  recommended?: QuantType;
}

const QUALITY_COLORS: Record<string, string> = {
  Lossless: 'text-status-success',
  Excellent: 'text-status-success',
  Good: 'text-accent-primary',
  Acceptable: 'text-status-warning',
  Lossy: 'text-status-error',
};

export function QuantSelector({ selected, onSelect, recommended }: QuantSelectorProps) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">Quantization</h2>
      <p className="text-text-muted text-[0.8125rem] mb-3">Select precision level</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1">
        {QUANT_ORDER.map((quant) => {
          const info = QUANT_TABLE[quant];
          const isActive = selected === quant;
          const isRecommended = recommended === quant;
          return (
            <button
              key={quant}
              onClick={() => onSelect(quant)}
              className={`relative px-2 py-2 rounded-lg text-[0.8125rem] font-medium transition-colors border ${
                isActive
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : isRecommended
                    ? 'bg-accent-primary/10 text-text-primary border-accent-primary/30'
                    : 'bg-transparent text-text-secondary border-border-default hover:bg-bg-tertiary'
              }`}
              aria-pressed={isActive}
            >
              <span className="block font-mono text-[0.75rem]">{quant}</span>
              <span className={`block text-[0.625rem] mt-0.5 ${
                isActive ? 'text-white/70' : QUALITY_COLORS[info.quality]
              }`}>
                {info.quality}
              </span>
              {isRecommended && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
