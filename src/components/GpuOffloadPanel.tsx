'use client';

import type { OffloadResult } from '@/lib/types';

interface GpuOffloadPanelProps {
  offload: OffloadResult;
}

export function GpuOffloadPanel({ offload }: GpuOffloadPanelProps) {
  if (offload.cpuLayers === 0) return null;

  return (
    <div className="bg-status-warning-bg border border-status-warning/30 rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-status-warning mb-3">
        <span aria-hidden="true">{'\u26A0'}</span> GPU Offload Required
      </h3>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-6 rounded-lg overflow-hidden flex">
          <div
            className="bg-accent-primary h-full"
            style={{ width: `${offload.percentOnGPU}%` }}
          />
          <div
            className="bg-text-muted/30 h-full"
            style={{ width: `${100 - offload.percentOnGPU}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[0.8125rem] mb-3">
        <span className="text-accent-primary font-mono">
          {offload.gpuLayers} layers on GPU ({offload.percentOnGPU.toFixed(0)}%)
        </span>
        <span className="text-text-muted font-mono">
          {offload.cpuLayers} layers on CPU
        </span>
      </div>
      <p className="text-text-secondary text-[0.8125rem]">
        CPU offloading significantly reduces inference speed. Each offloaded layer adds latency
        as data must transfer between GPU and system memory. Consider a lower quantization level
        to fit entirely in VRAM.
      </p>
    </div>
  );
}
