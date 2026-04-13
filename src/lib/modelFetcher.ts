import type { ModelConfig } from './types';
import { lookupModel } from './modelLookup';

export interface ParsedURL {
  source: 'huggingface' | 'ollama';
  org?: string;
  model: string;
  branch?: string;
  tag?: string;
}

/**
 * Parse a model URL into its components.
 * Returns null for invalid or unrecognized URLs.
 */
export function parseModelURL(url: string): ParsedURL | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);

  // Hugging Face: huggingface.co/{org}/{model}[/tree/{branch}]
  if (parsed.hostname === 'huggingface.co' || parsed.hostname === 'www.huggingface.co') {
    if (segments.length < 2) return null;
    const org = segments[0];
    const model = segments[1];
    let branch: string | undefined;

    if (segments.length >= 4 && segments[2] === 'tree') {
      branch = segments[3];
    }

    return { source: 'huggingface', org, model, branch };
  }

  // Ollama: ollama.com/library/{model}[:{tag}] or ollama.com/{user}/{model}
  if (parsed.hostname === 'ollama.com' || parsed.hostname === 'www.ollama.com') {
    if (segments.length === 0) return null;

    if (segments[0] === 'library' && segments.length >= 2) {
      const rawModel = segments[1];
      const [model, tag] = rawModel.includes(':')
        ? rawModel.split(':', 2)
        : [rawModel, undefined];
      return { source: 'ollama', model, tag };
    }

    // Community model: ollama.com/{user}/{model}
    if (segments.length >= 2) {
      const model = `${segments[0]}/${segments[1]}`;
      return { source: 'ollama', model };
    }

    // Single segment — could be a model name directly
    if (segments.length === 1) {
      const rawModel = segments[0];
      const [model, tag] = rawModel.includes(':')
        ? rawModel.split(':', 2)
        : [rawModel, undefined];
      return { source: 'ollama', model, tag };
    }

    return null;
  }

  return null;
}

/**
 * Fetch model metadata from Hugging Face via the proxy API.
 */
export async function fetchFromHuggingFace(
  org: string,
  model: string,
  branch?: string,
): Promise<ModelConfig> {
  const configBranch = branch ?? 'main';
  const configUrl = `https://huggingface.co/${org}/${model}/resolve/${configBranch}/config.json`;
  const modelApiUrl = `https://huggingface.co/api/models/${org}/${model}`;

  // Fetch both config.json and model API in parallel
  const [configResponse, modelApiResponse] = await Promise.all([
    fetch(`/api/proxy?url=${encodeURIComponent(configUrl)}`).catch(() => null),
    fetch(`/api/proxy?url=${encodeURIComponent(modelApiUrl)}`).catch(() => null),
  ]);

  // Extract param count from model API (safetensors.total or safetensors.parameters)
  let apiParams = 0;
  if (modelApiResponse?.ok) {
    try {
      const apiData = await modelApiResponse.json();
      const safetensors = apiData.safetensors as Record<string, unknown> | undefined;
      if (safetensors) {
        if (typeof safetensors.total === 'number') {
          apiParams = safetensors.total / 1e9;
        } else if (safetensors.parameters && typeof safetensors.parameters === 'object') {
          // Sum all parameter counts across dtypes
          const params = safetensors.parameters as Record<string, number>;
          const total = Object.values(params).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          if (total > 0) apiParams = total / 1e9;
        }
      }
    } catch {
      // Ignore API parse errors
    }
  }

  if (!configResponse?.ok) {
    // No config.json — fall back to lookup table
    const fallback = lookupModel(`${org}/${model}`) ?? lookupModel(model);
    if (fallback) {
      fallback.source = 'huggingface';
      fallback.name = `${org}/${model}`;
      if (apiParams > 0) fallback.totalParams = apiParams;
      return fallback;
    }
    throw new Error(`Failed to fetch config.json for ${org}/${model}. Try manual entry.`);
  }

  const config = await configResponse.json();
  const result = parseHuggingFaceConfig(config, `${org}/${model}`);

  // Use API param count if config didn't have one
  if (result.totalParams === 0 && apiParams > 0) {
    result.totalParams = apiParams;
  }

  // Fill any remaining zeros from lookup table
  if (result.totalParams === 0 || result.numLayers === 0 || result.numAttentionHeads === 0) {
    const lookup = lookupModel(`${org}/${model}`) ?? lookupModel(model);
    if (lookup) {
      if (result.totalParams === 0) result.totalParams = lookup.totalParams;
      if (result.numLayers === 0) result.numLayers = lookup.numLayers;
      if (result.numAttentionHeads === 0) result.numAttentionHeads = lookup.numAttentionHeads;
      if (result.numKVHeads === 0) result.numKVHeads = lookup.numKVHeads;
      if (result.hiddenSize === 0) result.hiddenSize = lookup.hiddenSize;
      if (result.maxContext === 0) result.maxContext = lookup.maxContext;
    }
  }

  return result;
}

function parseHuggingFaceConfig(config: Record<string, unknown>, name: string): ModelConfig {
  const hiddenSize = (config.hidden_size as number) ?? 0;
  const numAttentionHeads = (config.num_attention_heads as number) ?? 0;
  const numKVHeads = (config.num_key_value_heads as number) ?? numAttentionHeads;
  const numLayers = (config.num_hidden_layers as number) ?? 0;
  const maxContext = (config.max_position_embeddings as number) ?? 0;
  const dtype = (config.torch_dtype as string) ?? 'unknown';
  const architecture = Array.isArray(config.architectures)
    ? (config.architectures[0] as string)
    : 'Unknown';
  const modelType = (config.model_type as string) ?? '';

  // Estimate total params from architecture if not provided
  // This is a rough fallback — most models expose this in their model card
  const numExperts = (config.num_local_experts as number) ?? 0;
  const isMoE = numExperts > 1;

  // Try to get param count from various config locations
  let totalParams = 0;
  if (config.num_parameters) {
    totalParams = (config.num_parameters as number) / 1e9;
  }

  // If we couldn't get params from config, try the lookup table
  if (totalParams === 0) {
    const lookup = lookupModel(name);
    if (lookup) {
      totalParams = lookup.totalParams;
    }
  }

  return {
    name,
    source: 'huggingface',
    totalParams,
    numLayers,
    numAttentionHeads,
    numKVHeads,
    hiddenSize,
    maxContext,
    dtype,
    architecture,
    isMoE,
    activeParams: isMoE && config.num_experts_per_tok
      ? undefined // Would need more info to compute
      : undefined,
  };
}

/**
 * Fetch model metadata from Ollama via the proxy API.
 */
export async function fetchFromOllama(
  model: string,
  tag?: string,
): Promise<ModelConfig> {
  const modelName = tag ? `${model}:${tag}` : model;

  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://ollama.com/api/show',
      body: { name: modelName },
    }),
  });

  if (!response.ok) {
    // Fallback to lookup table
    const fallback = lookupModel(model) ?? lookupModel(modelName);
    if (fallback) {
      fallback.source = 'ollama';
      fallback.name = modelName;
      return fallback;
    }
    throw new Error(`Failed to fetch Ollama metadata for ${modelName} (HTTP ${response.status})`);
  }

  const data = await response.json();
  return parseOllamaResponse(data, modelName);
}

function parseOllamaResponse(data: Record<string, unknown>, name: string): ModelConfig {
  const modelInfo = (data.model_info ?? data.details ?? {}) as Record<string, unknown>;
  const parameters = (data.parameters ?? '') as string;

  // Extract from model_info keys (Ollama uses various key patterns)
  const hiddenSize = findNumericField(modelInfo, [
    'general.embedding_length',
    'llama.embedding_length',
    'hidden_size',
  ]);
  const numLayers = findNumericField(modelInfo, [
    'general.block_count',
    'llama.block_count',
    'num_hidden_layers',
  ]);
  const numAttentionHeads = findNumericField(modelInfo, [
    'llama.attention.head_count',
    'num_attention_heads',
  ]);
  const numKVHeads = findNumericField(modelInfo, [
    'llama.attention.head_count_kv',
    'num_key_value_heads',
  ]) ?? numAttentionHeads;
  const maxContext = findNumericField(modelInfo, [
    'llama.context_length',
    'general.context_length',
  ]);

  // Parse parameter count from parameters string or model_info
  let totalParams = findNumericField(modelInfo, [
    'general.parameter_count',
  ]);
  if (totalParams && totalParams > 1e6) {
    totalParams = totalParams / 1e9; // Convert to billions
  }

  // If still missing info, try lookup
  if (!hiddenSize || !numLayers || !totalParams) {
    const lookup = lookupModel(name);
    if (lookup) {
      return {
        ...lookup,
        source: 'ollama',
        name,
        hiddenSize: hiddenSize || lookup.hiddenSize,
        numLayers: numLayers || lookup.numLayers,
        numAttentionHeads: numAttentionHeads || lookup.numAttentionHeads,
        numKVHeads: numKVHeads || lookup.numKVHeads,
        totalParams: totalParams || lookup.totalParams,
        maxContext: maxContext || lookup.maxContext,
      };
    }
  }

  // Parse context from parameters string
  let parsedContext = maxContext ?? 0;
  const ctxMatch = parameters.match(/num_ctx\s+(\d+)/);
  if (ctxMatch && !parsedContext) {
    parsedContext = parseInt(ctxMatch[1], 10);
  }

  return {
    name,
    source: 'ollama',
    totalParams: totalParams ?? 0,
    numLayers: numLayers ?? 0,
    numAttentionHeads: numAttentionHeads ?? 0,
    numKVHeads: numKVHeads ?? 0,
    hiddenSize: hiddenSize ?? 0,
    maxContext: parsedContext,
    dtype: 'unknown',
    architecture: 'Unknown',
    isMoE: false,
  };
}

function findNumericField(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number') return val;
  }
  return undefined;
}

/**
 * Convenience: parse URL → fetch from appropriate source.
 */
export async function fetchModel(url: string): Promise<ModelConfig> {
  const parsed = parseModelURL(url);
  if (!parsed) {
    throw new Error('Invalid URL. Please enter a Hugging Face or Ollama model URL.');
  }

  if (parsed.source === 'huggingface') {
    if (!parsed.org) {
      throw new Error('Invalid Hugging Face URL. Expected format: huggingface.co/{org}/{model}');
    }
    return fetchFromHuggingFace(parsed.org, parsed.model, parsed.branch);
  }

  return fetchFromOllama(parsed.model, parsed.tag);
}
