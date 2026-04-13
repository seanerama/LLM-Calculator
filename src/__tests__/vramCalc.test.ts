import { describe, it, expect } from 'vitest';
import {
  calcWeightVRAM,
  calcKVCache,
  calcFrameworkOverhead,
  calcTotalVRAM,
  calcLayerOffload,
  calcMaxContext,
  getRecommendedQuant,
  getVerdict,
  generateRunCommand,
  getQuantComparison,
  getContextScaling,
  QUANT_TABLE,
  QUANT_ORDER,
} from '@/lib/vramCalc';
import type { ModelConfig } from '@/lib/types';

// Llama 3.1 8B test fixture
const LLAMA_8B: ModelConfig = {
  name: 'Llama-3.1-8B-Instruct',
  source: 'huggingface',
  totalParams: 8.03,
  numLayers: 32,
  numAttentionHeads: 32,
  numKVHeads: 8,
  hiddenSize: 4096,
  maxContext: 131072,
  dtype: 'bfloat16',
  architecture: 'LlamaForCausalLM',
  isMoE: false,
};

describe('calcWeightVRAM', () => {
  it('calculates FP16 weight VRAM correctly', () => {
    const result = calcWeightVRAM(8.03, 'FP16');
    expect(result).toBeCloseTo(16.06, 1);
  });

  it('calculates Q4_K_M weight VRAM correctly', () => {
    const result = calcWeightVRAM(8.03, 'Q4_K_M');
    expect(result).toBeCloseTo(4.58, 1);
  });

  it('calculates Q8_0 weight VRAM correctly', () => {
    const result = calcWeightVRAM(8.03, 'Q8_0');
    expect(result).toBeCloseTo(8.03, 1);
  });

  it('returns 0 for 0 params', () => {
    expect(calcWeightVRAM(0, 'FP16')).toBe(0);
  });
});

describe('calcKVCache', () => {
  it('calculates KV cache at 4096 context (GQA-aware)', () => {
    // 2 × 32 layers × 8 KV heads × 128 head_dim × 4096 × 2 bytes / 1e9
    // = 2 × 32 × 8 × 128 × 4096 × 2 / 1e9
    // = 536,870,912 / 1e9 ≈ 0.537 GB
    const result = calcKVCache(LLAMA_8B, 4096);
    expect(result).toBeCloseTo(0.537, 2);
  });

  it('calculates KV cache at 32768 context', () => {
    // Same formula × 8 = ~4.29 GB
    const result = calcKVCache(LLAMA_8B, 32768);
    expect(result).toBeCloseTo(4.295, 1);
  });

  it('scales linearly with context length', () => {
    const kv4k = calcKVCache(LLAMA_8B, 4096);
    const kv8k = calcKVCache(LLAMA_8B, 8192);
    expect(kv8k / kv4k).toBeCloseTo(2.0, 5);
  });

  it('uses num_kv_heads not num_attention_heads', () => {
    // If it used attention_heads (32), result would be 4× larger
    const result = calcKVCache(LLAMA_8B, 4096);
    // With 8 KV heads: ~0.537 GB. With 32 attention heads it would be ~2.15 GB
    expect(result).toBeLessThan(1.0);
  });

  it('returns 0 for 0 context', () => {
    expect(calcKVCache(LLAMA_8B, 0)).toBe(0);
  });
});

describe('calcTotalVRAM', () => {
  it('sums all components', () => {
    expect(calcTotalVRAM(4.58, 0.537, 0.5)).toBeCloseTo(5.617, 2);
  });
});

describe('calcLayerOffload', () => {
  it('returns all layers on GPU when VRAM is sufficient', () => {
    const result = calcLayerOffload(5.0, 8.0, 32);
    expect(result.gpuLayers).toBe(32);
    expect(result.cpuLayers).toBe(0);
    expect(result.percentOnGPU).toBe(100);
  });

  it('calculates partial offload correctly', () => {
    const result = calcLayerOffload(12.0, 8.0, 32);
    // floor((8/12) × 32) = floor(21.33) = 21
    expect(result.gpuLayers).toBe(21);
    expect(result.cpuLayers).toBe(11);
    expect(result.totalLayers).toBe(32);
  });

  it('returns 0 GPU layers when VRAM is 0', () => {
    const result = calcLayerOffload(12.0, 0, 32);
    expect(result.gpuLayers).toBe(0);
    expect(result.cpuLayers).toBe(32);
  });
});

describe('calcMaxContext', () => {
  it('returns viable context for 8GB VRAM with Q4_K_M', () => {
    const weightVRAM = calcWeightVRAM(8.03, 'Q4_K_M'); // ~4.58 GB
    const result = calcMaxContext(8.0, weightVRAM, LLAMA_8B, 'ollama');
    // Available for KV: 8.0 - 4.58 - 0.5 = 2.92 GB
    // Should give a reasonable context length
    expect(result).toBeGreaterThan(4096);
    expect(result).toBeLessThanOrEqual(131072);
  });

  it('returns 0 when weights alone exceed VRAM', () => {
    const weightVRAM = calcWeightVRAM(8.03, 'FP16'); // ~16 GB
    const result = calcMaxContext(8.0, weightVRAM, LLAMA_8B, 'ollama');
    expect(result).toBe(0);
  });

  it('caps at model maxContext', () => {
    const weightVRAM = calcWeightVRAM(8.03, 'Q4_K_M');
    const result = calcMaxContext(1000.0, weightVRAM, LLAMA_8B, 'ollama');
    expect(result).toBe(131072);
  });
});

describe('getRecommendedQuant', () => {
  it('recommends a quantization that fits in 8GB', () => {
    const result = getRecommendedQuant(8.03, 8.0, LLAMA_8B, 4096, 'ollama');
    // Q4_K_M: 4.58 + 0.537 + 0.5 = ~5.6 GB → fits
    // Q5_K_M: 5.46 + 0.537 + 0.5 = ~6.5 GB → fits
    // Q6_K: 6.26 + 0.537 + 0.5 = ~7.3 GB → fits
    // Q8_0: 8.03 + 0.537 + 0.5 = ~9.07 GB → doesn't fit
    expect(result).toBe('Q6_K');
  });

  it('returns IQ1_S when nothing fits', () => {
    const result = getRecommendedQuant(100, 2.0, LLAMA_8B, 4096, 'ollama');
    expect(result).toBe('IQ1_S');
  });

  it('recommends FP32 when VRAM is unlimited', () => {
    const result = getRecommendedQuant(8.03, 1000, LLAMA_8B, 4096, 'ollama');
    expect(result).toBe('FP32');
  });
});

describe('getVerdict', () => {
  it('returns fits when total <= available', () => {
    expect(getVerdict(5.0, 4.0, 8.0)).toBe('fits');
  });

  it('returns offload when weights fit but total exceeds', () => {
    expect(getVerdict(10.0, 7.0, 8.0)).toBe('offload');
  });

  it('returns too-large when weights alone exceed', () => {
    expect(getVerdict(20.0, 16.0, 8.0)).toBe('too-large');
  });
});

describe('generateRunCommand', () => {
  it('generates valid Ollama command', () => {
    const result = generateRunCommand('llama3.1:8b', 'ollama', 'Q4_K_M', 8192);
    expect(result).toContain('ollama run');
    expect(result).toContain('--num-ctx 8192');
  });

  it('generates valid vLLM command', () => {
    const result = generateRunCommand('meta-llama/Llama-3.1-8B', 'vllm', 'Q4_K_M', 8192);
    expect(result).toContain('vllm serve');
    expect(result).toContain('--max-model-len 8192');
    expect(result).toContain('--gpu-memory-utilization 0.90');
  });

  it('generates valid llama.cpp command', () => {
    const result = generateRunCommand('llama-3.1-8b', 'llama.cpp', 'Q4_K_M', 8192);
    expect(result).toContain('./llama-server');
    expect(result).toContain('-c 8192');
    expect(result).toContain('-ngl 999');
  });

  it('generates text-gen-webui command', () => {
    const result = generateRunCommand('llama-3.1-8b', 'text-gen-webui', 'Q4_K_M', 8192);
    expect(result).toContain('python server.py');
    expect(result).toContain('--max_seq_len 8192');
  });

  it('generates LM Studio command', () => {
    const result = generateRunCommand('llama-3.1-8b', 'lm-studio', 'Q4_K_M', 8192);
    expect(result).toContain('LM Studio');
    expect(result).toContain('Q4_K_M');
  });
});

describe('getQuantComparison', () => {
  it('returns all quantization levels', () => {
    const result = getQuantComparison(8.03, 8.0, LLAMA_8B, 4096, 'ollama');
    expect(result).toHaveLength(QUANT_ORDER.length);
  });

  it('marks exactly one as recommended', () => {
    const result = getQuantComparison(8.03, 8.0, LLAMA_8B, 4096, 'ollama');
    const recommended = result.filter((r) => r.recommended);
    expect(recommended).toHaveLength(1);
  });

  it('higher quants have higher VRAM requirements', () => {
    const result = getQuantComparison(8.03, 8.0, LLAMA_8B, 4096, 'ollama');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalVRAM).toBeLessThanOrEqual(result[i - 1].totalVRAM);
    }
  });

  it('includes quality label for each entry', () => {
    const result = getQuantComparison(8.03, 8.0, LLAMA_8B, 4096, 'ollama');
    result.forEach((entry) => {
      expect(entry.quality).toBeTruthy();
      expect(entry.quality).toBe(QUANT_TABLE[entry.quant].quality);
    });
  });
});

describe('getContextScaling', () => {
  it('returns ascending context lengths', () => {
    const result = getContextScaling(LLAMA_8B, 'Q4_K_M', 'ollama');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].contextLength).toBeGreaterThan(result[i - 1].contextLength);
    }
  });

  it('returns ascending VRAM values', () => {
    const result = getContextScaling(LLAMA_8B, 'Q4_K_M', 'ollama');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalVRAM).toBeGreaterThan(result[i - 1].totalVRAM);
    }
  });

  it('respects maxContext limit', () => {
    const result = getContextScaling(LLAMA_8B, 'Q4_K_M', 'ollama', 8192);
    result.forEach((point) => {
      expect(point.contextLength).toBeLessThanOrEqual(8192);
    });
  });

  it('stops at model maxContext by default', () => {
    const result = getContextScaling(LLAMA_8B, 'Q4_K_M', 'ollama');
    result.forEach((point) => {
      expect(point.contextLength).toBeLessThanOrEqual(LLAMA_8B.maxContext);
    });
  });
});
