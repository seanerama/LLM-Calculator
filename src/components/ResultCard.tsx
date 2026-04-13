'use client';

import type { VramBreakdown } from '@/lib/types';

interface ResultCardProps {
  breakdown: VramBreakdown;
}

const VERDICT_CONFIG = {
  fits: {
    icon: '\u2713',
    title: 'RUNS FULLY ON YOUR GPU',
    borderColor: 'border-status-success/30',
    accentColor: 'border-l-status-success',
    bgColor: 'bg-status-success-bg',
    textColor: 'text-status-success',
  },
  offload: {
    icon: '\u26A0',
    title: 'RUNS WITH CPU OFFLOAD',
    borderColor: 'border-status-warning/30',
    accentColor: 'border-l-status-warning',
    bgColor: 'bg-status-warning-bg',
    textColor: 'text-status-warning',
  },
  'too-large': {
    icon: '\u2715',
    title: 'EXCEEDS AVAILABLE VRAM',
    borderColor: 'border-status-error/30',
    accentColor: 'border-l-status-error',
    bgColor: 'bg-status-error-bg',
    textColor: 'text-status-error',
  },
};

export function ResultCard({ breakdown }: ResultCardProps) {
  const config = VERDICT_CONFIG[breakdown.verdict];

  const recommendation =
    breakdown.verdict === 'fits'
      ? `Using ${breakdown.percentUsed.toFixed(0)}% of available VRAM — room for larger context.`
      : breakdown.verdict === 'offload'
        ? 'Some layers will run on CPU. Expect reduced inference speed.'
        : 'Try a lower quantization level or reduce context length.';

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} border-l-4 ${config.accentColor} rounded-xl p-6`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl ${config.textColor}`} aria-hidden="true">{config.icon}</span>
        <h2 className={`text-[1.5rem] font-semibold ${config.textColor}`}>
          {config.title}
        </h2>
      </div>
      <div className="flex items-baseline gap-4 mb-2">
        <span className="font-mono text-[1.5rem] font-bold text-text-primary">
          {breakdown.totalVRAM.toFixed(1)} GB
        </span>
        <span className="text-text-secondary text-[0.9375rem]">
          of {breakdown.availableVRAM.toFixed(0)} GB available
        </span>
        <span className="text-text-muted text-[0.8125rem]">
          ({breakdown.percentUsed.toFixed(0)}%)
        </span>
      </div>
      <p className="text-text-secondary text-[0.8125rem]">{recommendation}</p>
    </div>
  );
}
