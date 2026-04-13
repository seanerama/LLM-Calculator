import { describe, it, expect } from 'vitest';
import { parseModelURL } from '@/lib/modelFetcher';
import { lookupModel } from '@/lib/modelLookup';
import { searchGPUs, getAllGPUs, getGPUByName } from '@/lib/gpuDatabase';

describe('parseModelURL', () => {
  it('parses HuggingFace model URL', () => {
    const result = parseModelURL('https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct');
    expect(result).toEqual({
      source: 'huggingface',
      org: 'meta-llama',
      model: 'Llama-3.1-8B-Instruct',
      branch: undefined,
    });
  });

  it('parses HuggingFace URL with branch', () => {
    const result = parseModelURL('https://huggingface.co/meta-llama/Llama-3.1-8B/tree/main');
    expect(result).toEqual({
      source: 'huggingface',
      org: 'meta-llama',
      model: 'Llama-3.1-8B',
      branch: 'main',
    });
  });

  it('parses Ollama library URL', () => {
    const result = parseModelURL('https://ollama.com/library/llama3.1');
    expect(result).toEqual({
      source: 'ollama',
      model: 'llama3.1',
      tag: undefined,
    });
  });

  it('parses Ollama URL with tag', () => {
    const result = parseModelURL('https://ollama.com/library/llama3.1:8b');
    expect(result).toEqual({
      source: 'ollama',
      model: 'llama3.1',
      tag: '8b',
    });
  });

  it('parses Ollama community model URL', () => {
    const result = parseModelURL('https://ollama.com/someuser/mymodel');
    expect(result).toEqual({
      source: 'ollama',
      model: 'someuser/mymodel',
    });
  });

  it('returns null for invalid URL', () => {
    expect(parseModelURL('not a url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseModelURL('')).toBeNull();
  });

  it('returns null for unsupported domain', () => {
    expect(parseModelURL('https://example.com/model')).toBeNull();
  });

  it('handles trailing slashes', () => {
    const result = parseModelURL('https://huggingface.co/meta-llama/Llama-3.1-8B/');
    expect(result).not.toBeNull();
    expect(result!.org).toBe('meta-llama');
    expect(result!.model).toBe('Llama-3.1-8B');
  });

  it('handles URLs with query params', () => {
    const result = parseModelURL('https://huggingface.co/meta-llama/Llama-3.1-8B?tab=files');
    expect(result).not.toBeNull();
    expect(result!.model).toBe('Llama-3.1-8B');
  });
});

describe('lookupModel', () => {
  it('finds Llama 3.1 8B by name', () => {
    const result = lookupModel('Llama 3.1 8B');
    expect(result).not.toBeNull();
    expect(result!.totalParams).toBeCloseTo(8.03, 1);
    expect(result!.numLayers).toBe(32);
    expect(result!.numKVHeads).toBe(8);
  });

  it('finds model by alias', () => {
    const result = lookupModel('llama3.1:8b');
    expect(result).not.toBeNull();
    expect(result!.totalParams).toBeCloseTo(8.03, 1);
  });

  it('returns null for unknown model', () => {
    const result = lookupModel('nonexistent-model-xyz');
    expect(result).toBeNull();
  });

  it('finds MoE model with activeParams', () => {
    const result = lookupModel('Mixtral 8x7B');
    expect(result).not.toBeNull();
    expect(result!.isMoE).toBe(true);
    expect(result!.activeParams).toBeCloseTo(12.9, 1);
  });

  it('is case-insensitive', () => {
    const result = lookupModel('LLAMA 3.1 8B');
    expect(result).not.toBeNull();
  });
});

describe('GPU database', () => {
  it('returns all GPUs', () => {
    const gpus = getAllGPUs();
    expect(gpus.length).toBeGreaterThan(50);
  });

  it('searches GPUs by name', () => {
    const results = searchGPUs('4090');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain('4090');
  });

  it('search is case-insensitive', () => {
    const results = searchGPUs('rtx 3090');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns all GPUs for empty query', () => {
    const all = getAllGPUs();
    const results = searchGPUs('');
    expect(results.length).toBe(all.length);
  });

  it('gets GPU by exact name', () => {
    const gpu = getGPUByName('RTX 4090 24GB');
    expect(gpu).not.toBeNull();
    expect(gpu!.vram).toBe(24);
  });

  it('returns null for unknown GPU', () => {
    expect(getGPUByName('NonExistent GPU')).toBeNull();
  });
});
