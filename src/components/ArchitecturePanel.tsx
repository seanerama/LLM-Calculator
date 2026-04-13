'use client';

import type { ModelConfig } from '@/lib/types';

interface ArchitecturePanelProps {
  model: ModelConfig;
}

export function ArchitecturePanel({ model }: ArchitecturePanelProps) {
  const headDim = model.numAttentionHeads > 0
    ? model.hiddenSize / model.numAttentionHeads
    : 0;
  const gqaRatio = model.numKVHeads > 0
    ? model.numAttentionHeads / model.numKVHeads
    : 1;

  const rows = [
    { label: 'Parameters', value: `${model.totalParams.toFixed(2)}B` },
    { label: 'Layers', value: model.numLayers.toString() },
    { label: 'Attention Heads', value: model.numAttentionHeads.toString() },
    { label: 'KV Heads', value: `${model.numKVHeads} (GQA ${gqaRatio}:1)` },
    { label: 'Head Dimension', value: headDim.toString() },
    { label: 'Hidden Size', value: model.hiddenSize.toLocaleString() },
    { label: 'Max Context', value: model.maxContext.toLocaleString() },
    { label: 'Weight dtype', value: model.dtype },
    { label: 'Architecture', value: model.architecture },
  ];

  if (model.isMoE) {
    rows.push({
      label: 'MoE',
      value: model.activeParams
        ? `Yes (${model.activeParams.toFixed(1)}B active of ${model.totalParams.toFixed(1)}B total)`
        : 'Yes',
    });
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-text-primary mb-4">Model Architecture</h3>
      <div className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-text-secondary text-[0.8125rem]">{label}</span>
            <span className="font-mono text-text-primary text-[0.8125rem]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
