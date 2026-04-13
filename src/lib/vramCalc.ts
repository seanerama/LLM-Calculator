import type {
  QuantType,
  QuantInfo,
  Framework,
  FrameworkInfo,
  ModelConfig,
  Verdict,
  VramBreakdown,
  OffloadResult,
  QuantComparison,
  ContextPoint,
} from './types';

// ─── Quantization Table ───────────────────────────────────

export const QUANT_TABLE: Record<QuantType, QuantInfo> = {
  FP32:   { type: 'FP32',   bytesPerParam: 4.00, quality: 'Lossless' },
  FP16:   { type: 'FP16',   bytesPerParam: 2.00, quality: 'Lossless' },
  BF16:   { type: 'BF16',   bytesPerParam: 2.00, quality: 'Lossless' },
  Q8_0:   { type: 'Q8_0',   bytesPerParam: 1.00, quality: 'Excellent' },
  Q6_K:   { type: 'Q6_K',   bytesPerParam: 0.78, quality: 'Excellent' },
  Q5_K_M: { type: 'Q5_K_M', bytesPerParam: 0.68, quality: 'Good' },
  Q5_K_S: { type: 'Q5_K_S', bytesPerParam: 0.66, quality: 'Good' },
  Q4_K_M: { type: 'Q4_K_M', bytesPerParam: 0.57, quality: 'Good' },
  Q4_K_S: { type: 'Q4_K_S', bytesPerParam: 0.54, quality: 'Acceptable' },
  Q3_K_M: { type: 'Q3_K_M', bytesPerParam: 0.43, quality: 'Acceptable' },
  Q2_K:   { type: 'Q2_K',   bytesPerParam: 0.31, quality: 'Lossy' },
  IQ1_S:  { type: 'IQ1_S',  bytesPerParam: 0.20, quality: 'Lossy' },
};

export const QUANT_ORDER: QuantType[] = [
  'FP32', 'FP16', 'BF16', 'Q8_0', 'Q6_K', 'Q5_K_M', 'Q5_K_S',
  'Q4_K_M', 'Q4_K_S', 'Q3_K_M', 'Q2_K', 'IQ1_S',
];

// ─── Framework Overhead Table ─────────────────────────────

export const FRAMEWORK_TABLE: Record<Framework, FrameworkInfo> = {
  'ollama':         { id: 'ollama',         name: 'Ollama',              overhead: 0.5,  formatPreference: 'GGUF', notes: 'Best for beginners, automatic GPU offload, easy install' },
  'vllm':           { id: 'vllm',           name: 'vLLM',               overhead: 1.5,  formatPreference: 'AWQ / GPTQ / FP16', notes: 'High-throughput serving, requires CUDA, PagedAttention overhead' },
  'llama.cpp':      { id: 'llama.cpp',      name: 'llama.cpp',          overhead: 0.3,  formatPreference: 'GGUF', notes: 'Low-level, CPU+GPU hybrid, minimal overhead, best flexibility' },
  'lm-studio':      { id: 'lm-studio',      name: 'LM Studio',          overhead: 0.4,  formatPreference: 'GGUF', notes: 'GUI wrapper for llama.cpp — same estimates as llama.cpp' },
  'text-gen-webui': { id: 'text-gen-webui', name: 'Text Generation WebUI', overhead: 0.6, formatPreference: 'GPTQ / GGUF / FP16', notes: 'Feature-rich, multiple backend support' },
};

// ─── Core Calculation Functions ───────────────────────────

/**
 * Calculate VRAM required for model weights at a given quantization.
 * Returns value in GB.
 */
export function calcWeightVRAM(params: number, quant: QuantType): number {
  const bytesPerParam = QUANT_TABLE[quant].bytesPerParam;
  return params * bytesPerParam;
}

/**
 * Calculate KV cache VRAM for a given context length.
 * Uses GQA-aware formula with num_kv_heads (not num_attention_heads).
 * Returns value in GB.
 */
export function calcKVCache(
  config: ModelConfig,
  seqLen: number,
  kvPrecision: number = 2, // bytes per element: 2 for FP16, 1 for Q8
): number {
  if (config.numAttentionHeads === 0 || config.numKVHeads === 0 || config.numLayers === 0) {
    return 0;
  }
  const headDim = config.hiddenSize / config.numAttentionHeads;
  return (
    (2 * config.numLayers * config.numKVHeads * headDim * seqLen * kvPrecision) /
    1_000_000_000
  );
}

/**
 * Get framework overhead in GB.
 */
export function calcFrameworkOverhead(framework: Framework): number {
  return FRAMEWORK_TABLE[framework].overhead;
}

/**
 * Sum weight VRAM + KV cache + framework overhead.
 * Returns value in GB.
 */
export function calcTotalVRAM(
  weight: number,
  kv: number,
  overhead: number,
): number {
  return weight + kv + overhead;
}

/**
 * Determine verdict based on VRAM requirements vs available.
 */
export function getVerdict(
  totalVRAM: number,
  weightVRAM: number,
  gpuVRAM: number,
): Verdict {
  if (totalVRAM <= gpuVRAM) return 'fits';
  if (weightVRAM <= gpuVRAM) return 'offload';
  return 'too-large';
}

/**
 * Calculate full VRAM breakdown with verdict.
 */
export function getVramBreakdown(
  config: ModelConfig,
  quant: QuantType,
  seqLen: number,
  framework: Framework,
  availableVRAM: number,
): VramBreakdown {
  const weightVRAM = calcWeightVRAM(config.totalParams, quant);
  const kvCacheVRAM = calcKVCache(config, seqLen);
  const frameworkOverhead = calcFrameworkOverhead(framework);
  const totalVRAM = calcTotalVRAM(weightVRAM, kvCacheVRAM, frameworkOverhead);
  const percentUsed = (totalVRAM / availableVRAM) * 100;
  const verdict = getVerdict(totalVRAM, weightVRAM, availableVRAM);

  return {
    weightVRAM,
    kvCacheVRAM,
    frameworkOverhead,
    totalVRAM,
    availableVRAM,
    percentUsed,
    verdict,
  };
}

/**
 * Calculate GPU layer offloading when model doesn't fully fit.
 */
export function calcLayerOffload(
  totalVRAM: number,
  gpuVRAM: number,
  numLayers: number,
): OffloadResult {
  if (totalVRAM <= gpuVRAM) {
    return {
      gpuLayers: numLayers,
      cpuLayers: 0,
      totalLayers: numLayers,
      percentOnGPU: 100,
    };
  }

  const gpuLayers = Math.max(
    0,
    Math.min(numLayers, Math.floor((gpuVRAM / totalVRAM) * numLayers)),
  );
  const cpuLayers = numLayers - gpuLayers;

  return {
    gpuLayers,
    cpuLayers,
    totalLayers: numLayers,
    percentOnGPU: (gpuLayers / numLayers) * 100,
  };
}

/**
 * Calculate maximum viable context length given hardware constraints.
 * Solves: gpuVRAM = weightVRAM + KVCache(seqLen) + frameworkOverhead for seqLen.
 */
export function calcMaxContext(
  gpuVRAM: number,
  weightVRAM: number,
  config: ModelConfig,
  framework: Framework,
): number {
  const overhead = calcFrameworkOverhead(framework);
  const availableForKV = gpuVRAM - weightVRAM - overhead;

  if (availableForKV <= 0) return 0;

  const headDim = config.hiddenSize / config.numAttentionHeads;
  const kvBytesPerToken =
    (2 * config.numLayers * config.numKVHeads * headDim * 2) / 1_000_000_000;

  if (kvBytesPerToken <= 0) return 0;

  const maxSeqLen = Math.floor(availableForKV / kvBytesPerToken);
  return Math.min(Math.max(0, maxSeqLen), config.maxContext);
}

/**
 * Find the highest-quality quantization that fits in available VRAM.
 */
export function getRecommendedQuant(
  params: number,
  gpuVRAM: number,
  config: ModelConfig,
  seqLen: number,
  framework: Framework,
): QuantType {
  const overhead = calcFrameworkOverhead(framework);

  for (const quant of QUANT_ORDER) {
    const weight = calcWeightVRAM(params, quant);
    const kv = calcKVCache(config, seqLen);
    const total = calcTotalVRAM(weight, kv, overhead);
    if (total <= gpuVRAM) return quant;
  }

  return 'IQ1_S';
}

/**
 * Generate a ready-to-paste terminal command for the selected configuration.
 */
export function generateRunCommand(
  model: string,
  framework: Framework,
  quant: QuantType,
  context: number,
): string {
  const quantTag = quant.toLowerCase().replace(/_/g, '_');

  switch (framework) {
    case 'ollama':
      return `ollama run ${model}:${quantTag} --num-ctx ${context}`;

    case 'vllm': {
      const vllmQuant = quant.startsWith('Q') ? 'awq' : quant.toLowerCase();
      return [
        `vllm serve ${model} \\`,
        `  --quantization ${vllmQuant} \\`,
        `  --max-model-len ${context} \\`,
        `  --gpu-memory-utilization 0.90`,
      ].join('\n');
    }

    case 'llama.cpp':
      return `./llama-server -m ${model}.gguf -c ${context} -ngl 999`;

    case 'lm-studio':
      return `# LM Studio: load ${model} (${quant}) with context ${context}\n# Use the LM Studio GUI to configure these settings`;

    case 'text-gen-webui':
      return `python server.py --model ${model} --max_seq_len ${context}`;
  }
}

/**
 * Generate comparison of all quantization levels at the current settings.
 */
export function getQuantComparison(
  params: number,
  gpuVRAM: number,
  config: ModelConfig,
  seqLen: number,
  framework: Framework,
): QuantComparison[] {
  const overhead = calcFrameworkOverhead(framework);
  const recommended = getRecommendedQuant(params, gpuVRAM, config, seqLen, framework);

  return QUANT_ORDER.map((quant) => {
    const weight = calcWeightVRAM(params, quant);
    const kv = calcKVCache(config, seqLen);
    const total = calcTotalVRAM(weight, kv, overhead);

    return {
      quant,
      totalVRAM: total,
      fits: total <= gpuVRAM,
      recommended: quant === recommended,
      quality: QUANT_TABLE[quant].quality,
    };
  });
}

/**
 * Generate context scaling data points for chart plotting.
 */
export function getContextScaling(
  config: ModelConfig,
  quant: QuantType,
  framework: Framework,
  maxContext?: number,
): ContextPoint[] {
  const limit = maxContext ?? config.maxContext;
  const weight = calcWeightVRAM(config.totalParams, quant);
  const overhead = calcFrameworkOverhead(framework);

  const contextLengths = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

  return contextLengths
    .filter((ctx) => ctx <= limit)
    .map((contextLength) => {
      const kv = calcKVCache(config, contextLength);
      return {
        contextLength,
        totalVRAM: calcTotalVRAM(weight, kv, overhead),
      };
    });
}
