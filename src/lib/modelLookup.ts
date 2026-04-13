import type { ModelConfig } from './types';
import modelsData from '@/data/models.json';

interface ModelEntry {
  name: string;
  aliases: string[];
  params: number;
  numLayers: number;
  numAttentionHeads: number;
  numKVHeads: number;
  hiddenSize: number;
  maxContext: number;
  isMoE: boolean;
  activeParams?: number;
}

const models: ModelEntry[] = modelsData as ModelEntry[];

export function lookupModel(name: string): ModelConfig | null {
  const q = name.toLowerCase().trim();

  const match = models.find(
    (m) =>
      m.name.toLowerCase() === q ||
      m.aliases.some((a) => a.toLowerCase() === q),
  );

  if (!match) {
    // Try partial match
    const partial = models.find(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        q.includes(m.name.toLowerCase()) ||
        m.aliases.some(
          (a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()),
        ),
    );
    if (!partial) return null;
    return entryToConfig(partial);
  }

  return entryToConfig(match);
}

function entryToConfig(entry: ModelEntry): ModelConfig {
  return {
    name: entry.name,
    source: 'manual',
    totalParams: entry.params,
    numLayers: entry.numLayers,
    numAttentionHeads: entry.numAttentionHeads,
    numKVHeads: entry.numKVHeads,
    hiddenSize: entry.hiddenSize,
    maxContext: entry.maxContext,
    dtype: 'bfloat16',
    architecture: 'Unknown',
    isMoE: entry.isMoE,
    activeParams: entry.activeParams,
  };
}
