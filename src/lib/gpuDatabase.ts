import type { GpuEntry } from './types';
import gpuData from '@/data/gpus.json';

const gpus: GpuEntry[] = gpuData as GpuEntry[];

export function getAllGPUs(): GpuEntry[] {
  return gpus;
}

export function searchGPUs(query: string): GpuEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return gpus;
  return gpus.filter((gpu) => gpu.name.toLowerCase().includes(q));
}

export function getGPUByName(name: string): GpuEntry | null {
  return gpus.find((gpu) => gpu.name === name) ?? null;
}
