// Shared types — LLM VRAM Calculator

// ─── Model Types ──────────────────────────────────────────

export interface ModelConfig {
  name: string;
  source: 'huggingface' | 'ollama' | 'manual';
  totalParams: number;          // billions
  numLayers: number;
  numAttentionHeads: number;
  numKVHeads: number;
  hiddenSize: number;
  maxContext: number;
  dtype: string;
  architecture: string;
  isMoE: boolean;
  activeParams?: number;        // billions, for MoE models
}

// ─── Hardware Types ───────────────────────────────────────

export interface HardwareProfile {
  gpuModel: string;
  vram: number;                 // GB
  gpuCount: number;
  systemRAM: number;            // GB
  memorySpeed?: 'DDR4' | 'DDR5' | 'LPDDR5';
  cpuCores?: number;
  cpuArch?: 'x86-64' | 'ARM' | 'Apple Silicon';
  isAppleSilicon: boolean;
  unifiedMemory?: number;       // GB, Apple Silicon only
  framework: Framework;
}

export interface GpuEntry {
  name: string;
  vram: number;                 // GB
  vendor: 'nvidia' | 'amd' | 'intel' | 'apple';
  tier: 'consumer' | 'workstation' | 'datacenter' | 'apple-silicon';
}

// ─── Quantization Types ───────────────────────────────────

export type QuantType =
  | 'FP32' | 'FP16' | 'BF16'
  | 'Q8_0' | 'Q6_K'
  | 'Q5_K_M' | 'Q5_K_S'
  | 'Q4_K_M' | 'Q4_K_S'
  | 'Q3_K_M'
  | 'Q2_K'
  | 'IQ1_S';

export interface QuantInfo {
  type: QuantType;
  bytesPerParam: number;
  quality: 'Lossless' | 'Excellent' | 'Good' | 'Acceptable' | 'Lossy';
}

// ─── Framework Types ──────────────────────────────────────

export type Framework =
  | 'ollama'
  | 'vllm'
  | 'llama.cpp'
  | 'lm-studio'
  | 'text-gen-webui';

export interface FrameworkInfo {
  id: Framework;
  name: string;
  overhead: number;             // GB
  formatPreference: string;
  notes: string;
}

// ─── Calculation Result Types ─────────────────────────────

export type Verdict = 'fits' | 'offload' | 'too-large';

export interface VramBreakdown {
  weightVRAM: number;           // GB
  kvCacheVRAM: number;          // GB
  frameworkOverhead: number;    // GB
  totalVRAM: number;            // GB
  availableVRAM: number;        // GB
  percentUsed: number;          // 0-100+
  verdict: Verdict;
}

export interface OffloadResult {
  gpuLayers: number;
  cpuLayers: number;
  totalLayers: number;
  percentOnGPU: number;
}

export interface QuantComparison {
  quant: QuantType;
  totalVRAM: number;            // GB
  fits: boolean;
  recommended: boolean;
  quality: string;
}

export interface ContextPoint {
  contextLength: number;
  totalVRAM: number;            // GB
}
